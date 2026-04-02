'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const SITE_PASSWORD   = 'VIPSCOUTACCESS'
const STORAGE_KEY     = 'vipscout_auth'
const COOKIE_NAME     = 'vipscout_auth'

interface SiteAuthState {
  isAuthenticated: boolean
  authenticate: (password: string) => boolean
  deauthenticate: () => void
}

const SiteAuthContext = createContext<SiteAuthState | null>(null)

export function SiteGuardProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // On mount: check sessionStorage to restore client-side state
  useEffect(() => {
    try {
      setIsAuthenticated(sessionStorage.getItem(STORAGE_KEY) === SITE_PASSWORD)
    } catch {}
  }, [])

  function authenticate(password: string): boolean {
    if (password !== SITE_PASSWORD) return false

    // Set session cookie (no Max-Age = cleared when browser closes)
    document.cookie = `${COOKIE_NAME}=${SITE_PASSWORD}; path=/; SameSite=Strict`
    try { sessionStorage.setItem(STORAGE_KEY, SITE_PASSWORD) } catch {}
    setIsAuthenticated(true)
    return true
  }

  function deauthenticate() {
    document.cookie = `${COOKIE_NAME}=; path=/; Max-Age=0`
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
    setIsAuthenticated(false)
  }

  return (
    <SiteAuthContext.Provider value={{ isAuthenticated, authenticate, deauthenticate }}>
      {children}
    </SiteAuthContext.Provider>
  )
}

export function useSiteAuth(): SiteAuthState {
  const ctx = useContext(SiteAuthContext)
  if (!ctx) throw new Error('useSiteAuth must be used inside <SiteGuardProvider>')
  return ctx
}
