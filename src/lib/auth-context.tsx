'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getBrowserClient } from './supabase-browser'

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  followed_schools: string[]
  onboarding_data: Record<string, unknown> | null
  subscription_tier: 'free' | 'premium' | 'extended'
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | null
  /** UTC ISO timestamp when Premium 30-day access expires (null = never set) */
  access_expires_at: string | null
  stripe_customer_id: string | null
  preferences: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/** True when the user has a currently-active paid subscription or in-window premium access. */
export function hasActiveAccess(profile: UserProfile | null): boolean {
  if (!profile) return false
  const { subscription_tier: tier, subscription_status, access_expires_at } = profile
  if (tier === 'extended') {
    return subscription_status === 'active' || subscription_status === 'trialing'
  }
  if (tier === 'premium') {
    if (!access_expires_at) return true
    return new Date(access_expires_at) > new Date()
  }
  return false
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  /** Current access token — updated on every auth state change, never calls getSession(). */
  sessionToken: string | null
  loading: boolean
  /** Send a magic-link to the given email. Returns error string or null. */
  signIn: (email: string) => Promise<{ error: string | null }>
  /** Sign in with email + password. Returns error string or null. */
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  /**
   * Toggle follow on a school slug.
   * Deduplicates — calling twice with the same slug is safe.
   * Returns the NEW isFollowing state.
   */
  toggleFollow: (slug: string) => Promise<boolean>
  isFollowing: (slug: string) => boolean
  updateProfile: (
    data: Partial<Pick<UserProfile, 'display_name' | 'onboarding_data'>>
  ) => Promise<{ error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
  /** Refresh profile from DB. Returns the latest profile (or null on error). */
  refreshProfile: () => Promise<UserProfile | null>
  /**
   * Poll fetchProfile every 2s (up to 5 attempts / 10s) until plan_type is
   * 'premium'. Call this after a successful Stripe checkout redirect so the
   * context stays live while the webhook fires asynchronously.
   * isConfirmingAccess is true while polling is in progress.
   */
  confirmAccess: () => void
  /** True while confirmAccess() is polling for the premium update. */
  isConfirmingAccess: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isConfirmingAccess, setIsConfirmingAccess] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Holds the current access token without ever calling getSession().
  // Updated synchronously in onAuthStateChange so callbacks can read the token
  // from a ref instead of awaiting getSession() (which acquires an IndexedDB lock).
  const sessionTokenRef = useRef<string | null>(null)

  const supabase = getBrowserClient()

  const fetchProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error || !data) return null

      const row = data as Record<string, unknown>
      const normalized: UserProfile = {
        id: row.id as string,
        email: row.email as string,
        display_name: (row.display_name as string | null) ?? null,
        followed_schools: Array.isArray(row.followed_schools)
          ? (row.followed_schools as string[])
          : [],
        onboarding_data: (row.onboarding_data as Record<string, unknown> | null) ?? null,
        subscription_tier: (row.plan_type as UserProfile['subscription_tier']) ?? 'free',
        subscription_status: (row.subscription_status as UserProfile['subscription_status']) ?? null,
        access_expires_at: (row.access_expires_at as string | null) ?? null,
        stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
        preferences: (row.preferences as Record<string, unknown> | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }
      setProfile(normalized)
      return normalized
    },
    [supabase]
  )

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null
    return fetchProfile(user.id)
  }, [user, fetchProfile])

  const confirmAccess = useCallback(() => {
    if (!user) return
    setIsConfirmingAccess(true)
    let attempts = 0
    const MAX = 5

    const poll = async () => {
      attempts++
      console.log(`[confirmAccess] poll ${attempts}/${MAX} userId=${user.id}`)

      // Read token from ref — zero async, no IndexedDB lock.
      // sessionTokenRef is updated synchronously in onAuthStateChange.
      const token = sessionTokenRef.current
      if (!token) {
        console.warn('[confirmAccess] no token in ref — retrying')
        if (attempts < MAX) { setTimeout(poll, 2000) } else { setIsConfirmingAccess(false) }
        return
      }

      // Fetch via plain HTTP — bypasses the Supabase JS client lock entirely
      let data: Record<string, unknown> | null = null
      try {
        const res = await fetch('/api/debug-profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) data = await res.json() as Record<string, unknown>
      } catch (err) {
        console.warn('[confirmAccess] fetch error:', err)
      }

      console.log('[confirmAccess] debug-profile result:', JSON.stringify(data))

      const expiresAt = data?.access_expires_at as string | null | undefined
      if (
        data?.plan_type === 'premium' &&
        expiresAt &&
        new Date(expiresAt) > new Date()
      ) {
        console.log(
          '[confirmAccess] premium confirmed — current tier:',
          profile?.subscription_tier ?? 'unknown',
          '| setting subscription_tier=premium, access_expires_at=', expiresAt
        )
        setProfile(prev => {
          if (!prev) return prev
          const updated = { ...prev, subscription_tier: 'premium' as const, access_expires_at: expiresAt }
          console.log('[confirmAccess] setProfile called — new tier:', updated.subscription_tier)
          return updated
        })
        setIsConfirmingAccess(false)
        return
      }

      if (attempts >= MAX) {
        console.warn('[confirmAccess] max attempts reached — plan_type still not premium')
        setIsConfirmingAccess(false)
        return
      }

      setTimeout(poll, 2000)
    }

    // First check at 1.5s — gives the webhook time to fire
    setTimeout(poll, 1500)
  // sessionTokenRef is a stable ref — no dep needed; profile read for logging only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Post-checkout access confirmation ────────────────────────────────────────
  // CheckoutButton sets 'pendingAccessConfirm' in sessionStorage right before
  // redirecting to Stripe. On return, this effect fires as soon as the user is
  // available and kicks off the confirmAccess() polling loop without relying on
  // URL params (which can be stripped by middleware before the component reads them).
  useEffect(() => {
    if (!user) return
    try {
      if (sessionStorage.getItem('pendingAccessConfirm') !== 'true') return
      sessionStorage.removeItem('pendingAccessConfirm')
      confirmAccess()
    } catch {}
  // confirmAccess is stable (useCallback with [user, fetchProfile, supabase])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // ── Bootstrap session ──────────────────────────────────────────────────────
  // Use onAuthStateChange exclusively — it fires INITIAL_SESSION immediately on
  // registration with the current cookies-based session, eliminating the race
  // condition that occurred when getSession() and onAuthStateChange both ran on
  // mount and getSession() occasionally resolved first with a stale null value,
  // causing loading to be set false before the user was populated.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, s: Session | null) => {
      // Keep the ref in sync first — callbacks read from here instead of calling getSession()
      sessionTokenRef.current = s?.access_token ?? null
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        await fetchProfile(s.user.id)
        // Process any pending follow saved by FollowButton before sign-in
        if (event === 'SIGNED_IN') {
          try {
            const pending = localStorage.getItem('pendingFollow')
            if (pending) {
              localStorage.removeItem('pendingFollow')
              setProfile((prev) => {
                if (!prev || !s?.user) return prev
                const current = prev.followed_schools
                if (current.includes(pending)) return prev
                const next = Array.from(new Set([...current, pending]))
                supabase
                  .from('user_profiles')
                  .update({ followed_schools: next } as never)
                  .eq('id', s.user!.id)
                  .then(() => {})
                return { ...prev, followed_schools: next }
              })
            }
          } catch {}
        }
      } else {
        setProfile(null)
      }
      // INITIAL_SESSION is the first event fired — marks the end of bootstrap.
      // Only set loading=false here so the nav never renders in an indeterminate state.
      if (event === 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? '')

      // Thread authReturnTo through the magic link so route.ts can redirect
      // back to the right page after the server-side code exchange.
      let returnPath = '/schools'
      try {
        returnPath = sessionStorage.getItem('authReturnTo') ?? '/schools'
      } catch {}

      const callbackUrl = returnPath !== '/schools'
        ? `${base}/auth/callback?next=${encodeURIComponent(returnPath)}`
        : `${base}/auth/callback`

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: callbackUrl },
      })
      return { error: error?.message ?? null }
    },
    [supabase]
  )

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      return { error: error?.message ?? null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    sessionTokenRef.current = null
    setUser(null)
    setProfile(null)

    // Both calls needed:
    // - Server route clears HttpOnly cookies + revokes session
    // - Browser SDK clears JS-readable sb-* cookie with correct
    //   domain/path/Secure attributes
    await Promise.all([
      fetch('/api/auth/signout', { method: 'POST' }).catch(() => {}),
      getBrowserClient().auth.signOut().catch(() => {}),
    ])

    router.push('/')
  }, [router])

  const toggleFollow = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!user) return false

      // Use followed_schools from profile if available; fall back to empty array
      // so that clicks work even when the user_profiles row hasn't loaded yet.
      const current = profile?.followed_schools ?? []
      const isCurrentlyFollowing = current.includes(slug)

      // Deduplicate on add; filter on remove
      const next = isCurrentlyFollowing
        ? current.filter((s) => s !== slug)
        : Array.from(new Set([...current, slug]))

      // Optimistic update
      setProfile((prev) => (prev ? { ...prev, followed_schools: next } : prev))

      const { error } = await supabase
        .from('user_profiles')
        .update({ followed_schools: next } as never)
        .eq('id', user.id)

      if (error) {
        // Roll back on failure
        setProfile((prev) => (prev ? { ...prev, followed_schools: current } : prev))
        return isCurrentlyFollowing
      }

      return !isCurrentlyFollowing
    },
    [user, profile, supabase]
  )

  const isFollowing = useCallback(
    (slug: string): boolean => profile?.followed_schools.includes(slug) ?? false,
    [profile]
  )

  const updateProfile = useCallback(
    async (
      data: Partial<Pick<UserProfile, 'display_name' | 'onboarding_data'>>
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not signed in' }

      const { error } = await supabase
        .from('user_profiles')
        .update(data as never)
        .eq('id', user.id)

      if (!error) {
        setProfile((prev) => (prev ? { ...prev, ...data } : prev))
      }
      return { error: error?.message ?? null }
    },
    [user, supabase]
  )

  const deleteAccount = useCallback(async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not signed in' }

    // No Bearer token needed — the route uses the HttpOnly session cookie.
    const res = await fetch('/api/profile/delete', { method: 'DELETE' })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: (body as { error?: string }).error ?? 'Deletion failed' }
    }

    sessionTokenRef.current = null
    setUser(null)
    setProfile(null)
    getBrowserClient().auth.signOut().catch(() => {})  // clear sb-* cookie
    router.push('/')
    return { error: null }
  }, [user, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        sessionToken: session?.access_token ?? null,
        loading,
        signIn,
        signInWithPassword,
        signOut,
        toggleFollow,
        isFollowing,
        updateProfile,
        deleteAccount,
        refreshProfile,
        confirmAccess,
        isConfirmingAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
