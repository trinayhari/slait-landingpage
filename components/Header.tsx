'use client'

import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, User, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { OrganizationMembership } from "@/lib/types"

const glassStyle = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px) saturate(110%)',
  WebkitBackdropFilter: 'blur(8px) saturate(110%)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.28), 0 20px 60px rgba(0,0,0,0.5)',
} as const

/** More opaque background for auth panel so login/signup form is easily readable */
const authPanelStyle = {
  background: 'rgba(18,18,24,0.96)',
  backdropFilter: 'blur(16px) saturate(120%)',
  WebkitBackdropFilter: 'blur(16px) saturate(120%)',
  border: '1px solid rgba(255,255,255,0.15)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
} as const

interface HeaderProps {
  fileName?: string | null
}

const STORAGE_MODE_KEY = "slait:activeMode"
const STORAGE_ORG_KEY = "slait:selectedOrg"

export default function Header({ fileName: _fileName }: HeaderProps) {
  const { user, profile, loading, signOut, signInWithPassword, signUp } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [authPanelOpen, setAuthPanelOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const authPanelRef = useRef<HTMLDivElement>(null)
  const [redirect, setRedirect] = useState("/")
  const [urlError, setUrlError] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [activeMode, setActiveMode] = useState<"personal" | "org">("personal")
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
      setRedirect(params.get("redirect") ?? "/")
    const err = params.get("error")
    if (err === "auth") setUrlError("auth")
    const login = params.get("login")
    const signup = params.get("signup")
    if (login === "true") {
      setAuthMode("login")
      setAuthPanelOpen(true)
    } else if (signup === "true") {
      setAuthMode("signup")
      setAuthPanelOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    if (!user) {
      setMemberships([])
      setActiveMode("personal")
      setSelectedOrgSlug("")
      return
    }

    fetch("/api/orgs")
      .then((res) => res.json())
      .then((data) => {
        const orgs = Array.isArray(data.memberships) ? (data.memberships as OrganizationMembership[]) : []
        setMemberships(orgs)
        const storedOrg = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_ORG_KEY) : null
        const fallbackOrg = orgs[0]?.organization?.slug ?? ""
        const selectedOrg =
          storedOrg && orgs.some((membership) => membership.organization.slug === storedOrg) ? storedOrg : fallbackOrg
        setSelectedOrgSlug(selectedOrg)

        const storedMode = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_MODE_KEY) : null
        if (storedMode === "org" && selectedOrg) {
          setActiveMode("org")
        } else {
          setActiveMode("personal")
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_MODE_KEY, "personal")
          }
        }
      })
      .catch(() => {
        setMemberships([])
        setActiveMode("personal")
        setSelectedOrgSlug("")
      })
  }, [user])

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith("/org/")) {
      setActiveMode("org")
      const parts = pathname.split("/")
      if (parts.length > 2 && parts[2]) {
        setSelectedOrgSlug(parts[2])
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_ORG_KEY, parts[2])
          window.localStorage.setItem(STORAGE_MODE_KEY, "org")
        }
      }
    } else {
      const storedMode = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_MODE_KEY) : null
      if (storedMode === "org" && selectedOrgSlug) {
        setActiveMode("org")
      } else {
        setActiveMode("personal")
      }
    }
  }, [pathname, selectedOrgSlug])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setDropdownOpen(false)
      if (authPanelRef.current && !authPanelRef.current.contains(target)) {
        setAuthPanelOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    try {
      if (authMode === "login") {
        const { error } = await signInWithPassword(email, password)
        if (error) {
          setAuthError(error.message)
          return
        }
        setAuthPanelOpen(false)
        if (typeof window !== "undefined") {
          window.location.href = redirect
        } else {
          router.refresh()
          router.push(redirect)
        }
      } else {
        const { error } = await signUp(email, password, { full_name: fullName || undefined })
        if (error) {
          setAuthError(error.message)
          return
        }
        setSignupSuccess(true)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const openAuthPanel = (mode: "login" | "signup") => {
    setAuthMode(mode)
    setAuthError(null)
    setSignupSuccess(false)
    setAuthPanelOpen(true)
  }

  function isActive(href: string, options?: { exact?: boolean }) {
    if (href === '/') return pathname === '/'
    if (options?.exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  function navItemClass(href: string, options?: { exact?: boolean }) {
    return isActive(href, options)
      ? "px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-foreground transition-colors"
      : "px-3 py-1 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
  }

  function goPersonal() {
    setActiveMode("personal")
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_MODE_KEY, "personal")
    }
    if (profile?.handle) {
      router.push(`/profile/${profile.handle}`)
      return
    }
    router.push("/")
  }

  function goOrg(slug: string) {
    setActiveMode("org")
    setSelectedOrgSlug(slug)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_ORG_KEY, slug)
      window.localStorage.setItem(STORAGE_MODE_KEY, "org")
    }
    router.push(`/org/${slug}`)
  }

  const selectedMembership =
    memberships.find((membership) => membership.organization.slug === selectedOrgSlug) ?? null
  const orgModeAdmin = selectedMembership?.role === "admin"
  const showSlateTab = activeMode !== "org" || orgModeAdmin
  const slateHref = activeMode === "org" && selectedOrgSlug ? `/org/${selectedOrgSlug}/slate` : "/slate"
  const profileHref =
    activeMode === "org" && selectedOrgSlug
      ? `/org/${selectedOrgSlug}`
      : profile?.handle
      ? `/profile/${profile.handle}`
      : "/dashboard"

  return (
    <div className="sticky top-3 z-50 flex justify-center px-4 mb-4">
      {/* Liquid glass pill */}
      <div
        className="relative flex items-center gap-2 rounded-full w-full max-w-3xl px-2 py-1.5"
        style={glassStyle}
      >
        {/* Top-edge specular highlight — the key "glass" detail */}
        <div
          className="absolute inset-x-4 top-[1px] h-[1.5px] rounded-full pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.55) 70%, transparent 95%)' }}
        />
        {/* Subtle inner glow to simulate refracted light */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'linear-gradient(175deg, rgba(255,255,255,0.07) 0%, transparent 60%)' }}
        />

        {/* Left: Nav links */}
        <nav className="flex items-center gap-0.5 flex-1 pl-1 min-w-0 overflow-x-auto flex-nowrap">
          <Link href="/" className={`shrink-0 ${navItemClass("/")}`}>Home</Link>
          {showSlateTab && (
            <Link
              href={slateHref}
              className={`shrink-0 ${navItemClass(slateHref, { exact: activeMode === "org" })}`}
            >
              The Slate
            </Link>
          )}
          {user && (
            <div className="ml-1 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-1 py-0.5">
              <button
                type="button"
                onClick={goPersonal}
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeMode === "personal" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedOrgSlug) goOrg(selectedOrgSlug)
                }}
                disabled={!selectedOrgSlug}
                className={`px-2 py-0.5 rounded-full text-xs disabled:opacity-50 ${
                  activeMode === "org" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Org
              </button>
            </div>
          )}
        </nav>

        {/* Center: Logo */}
        <Link href="/" className="shrink-0 flex items-center absolute left-1/2 -translate-x-1/2">
          <img src="/images/Slait.png" alt="Slait" className="h-8 w-auto" />
        </Link>

        {/* Right: Auth */}
        <div className="flex items-center gap-2 shrink-0 flex-1 justify-end pr-1">
          {!loading && (
            <>
              {user && activeMode === "org" && selectedOrgSlug && (
                <Link
                  href={`/org/${selectedOrgSlug}/members`}
                  className={navItemClass(`/org/${selectedOrgSlug}/members`)}
                >
                  Members
                </Link>
              )}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-foreground transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.11)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                    }}
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/25 text-primary text-xs font-medium">
                        {(profile?.display_name || profile?.handle || user.email)?.[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                    <span className="hidden sm:inline text-muted-foreground text-xs">
                      {profile?.handle || profile?.display_name || user.email}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-44 rounded-2xl py-1.5 shadow-2xl"
                      style={glassStyle}
                    >
                      <Link
                        href={profileHref}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] rounded-xl mx-1 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      {!selectedOrgSlug && (
                        <Link
                          href="/org/new"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] rounded-xl mx-1 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          New organization
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); signOut() }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] rounded-xl mx-1 transition-colors"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative flex items-center gap-2" ref={authPanelRef}>
                  <button
                    type="button"
                    onClick={() => openAuthPanel("login")}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors"
                    style={{ background: 'rgba(255,255,255,0.11)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthPanel("signup")}
                    className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Sign up
                  </button>

                  {authPanelOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-80 rounded-2xl py-4 px-4 shadow-2xl z-[100]"
                      style={authPanelStyle}
                    >
                      {signupSuccess ? (
                        <div className="space-y-3 text-center">
                          <p className="text-sm text-primary">
                            Check your email to confirm your account, then sign in.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setSignupSuccess(false); setAuthMode("login") }}
                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            Go to sign in
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-semibold text-foreground mb-3">
                            {authMode === "login" ? "Sign in" : "Create account"}
                          </h3>
                          {urlError === "auth" && (
                            <div className="mb-3 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-2 text-xs text-amber-200">
                              Authentication failed. Please try again.
                            </div>
                          )}
                          {authError && (
                            <div className="mb-3 rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-2 text-xs text-red-200">
                              {authError}
                            </div>
                          )}
                          <form onSubmit={handleAuthSubmit} className="space-y-3">
                            {authMode === "signup" && (
                              <div>
                                <label htmlFor="header-fullName" className="block text-xs font-medium text-foreground mb-1">Name (optional)</label>
                                <input
                                  id="header-fullName"
                                  type="text"
                                  value={fullName}
                                  onChange={(e) => setFullName(e.target.value)}
                                  className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Your name"
                                />
                              </div>
                            )}
                            <div>
                              <label htmlFor="header-email" className="block text-xs font-medium text-foreground mb-1">Email</label>
                              <input
                                id="header-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="you@example.com"
                              />
                            </div>
                            <div>
                              <label htmlFor="header-password" className="block text-xs font-medium text-foreground mb-1">Password</label>
                              <input
                                id="header-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={authMode === "signup" ? 6 : undefined}
                                className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="••••••••"
                              />
                              {authMode === "signup" && <p className="mt-0.5 text-xs text-muted-foreground">At least 6 characters</p>}
                            </div>
                            <button
                              type="submit"
                              disabled={authLoading}
                              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                              {authLoading
                                ? (authMode === "login" ? "Signing in…" : "Creating account…")
                                : (authMode === "login" ? "Sign in" : "Sign up")}
                            </button>
                          </form>
                          <p className="mt-3 text-center text-xs text-muted-foreground">
                            {authMode === "login" ? (
                              <>Don&apos;t have an account?{" "}
                                <button type="button" onClick={() => { setAuthMode("signup"); setAuthError(null) }} className="text-primary hover:underline">
                                  Sign up
                                </button>
                              </>
                            ) : (
                              <>Already have an account?{" "}
                                <button type="button" onClick={() => { setAuthMode("login"); setAuthError(null) }} className="text-primary hover:underline">
                                  Sign in
                                </button>
                              </>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
