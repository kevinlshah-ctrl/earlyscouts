'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
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
  /** UTC ISO timestamp when Premium 3-day access expires (null = never set) */
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
  /** Refresh profile from DB (e.g. after a Stripe webhook updates tier). */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  // ── Bootstrap session ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, s: Session | null) => {
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
              // Use the freshly fetched profile to toggle
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }, [supabase])

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

    const { data: { session: s } } = await supabase.auth.getSession()
    const token = s?.access_token
    if (!token) return { error: 'No active session' }

    const res = await fetch('/api/profile/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: (body as { error?: string }).error ?? 'Deletion failed' }
    }

    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    return { error: null }
  }, [user, supabase])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signInWithPassword,
        signOut,
        toggleFollow,
        isFollowing,
        updateProfile,
        deleteAccount,
        refreshProfile,
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
