"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/types"

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const buildHandleBase = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "")
    const nonEmpty = sanitized.length >= 2 ? sanitized : "user"
    return nonEmpty.slice(0, 24)
  }

  const generateHandleCandidates = (authUser: User) => {
    const nameFromMeta =
      typeof authUser.user_metadata?.full_name === "string"
        ? authUser.user_metadata.full_name
        : ""
    const emailPrefix = authUser.email?.split("@")[0] ?? ""
    const base = buildHandleBase(nameFromMeta || emailPrefix || "user")
    const stableSuffix = authUser.id.replace(/-/g, "").slice(0, 6).toLowerCase()
    const randomSuffix = Math.random().toString(36).slice(2, 8)

    return [`${base}-${stableSuffix}`, `${base}-${randomSuffix}`, `${base}-${Date.now().toString().slice(-6)}`]
  }

  const ensureProfile = async (authUser: User) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()

    if (!error && data) {
      setProfile(data as Profile)
      return
    }

    if (error) {
      setProfile(null)
      return
    }

    const displayName =
      typeof authUser.user_metadata?.full_name === "string"
        ? authUser.user_metadata.full_name
        : authUser.email?.split("@")[0] ?? null
    const avatarUrl =
      typeof authUser.user_metadata?.avatar_url === "string"
        ? authUser.user_metadata.avatar_url
        : null

    for (const handle of generateHandleCandidates(authUser)) {
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          handle,
          display_name: displayName,
          avatar_url: avatarUrl,
        })
        .select("*")
        .single()

      if (!createError && created) {
        setProfile(created as Profile)
        return
      }
    }

    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await ensureProfile(user)
  }

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let loadingCleared = false

    const clearLoading = () => {
      if (!loadingCleared) {
        loadingCleared = true
        setLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await ensureProfile(session.user)
      } else {
        setProfile(null)
      }
      clearLoading()
    })

    // Initial session/profile load on mount so we don't rely solely on the auth state change event
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await ensureProfile(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
      clearLoading()
    })()

    // Fallback: ensure we never hang if onAuthStateChange is slow
    timeoutId = setTimeout(clearLoading, 150)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (
    email: string,
    password: string,
    metadata?: { full_name?: string }
  ) => {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev").replace(/\/$/, "")
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    try {
      await supabase.auth.signOut({ scope: "global" })
    } catch {
      // Continue with server-side/session cleanup below.
    }

    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" })
    } catch {
      // Continue to local cleanup + hard navigation.
    }

    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i)
          if (key && key.startsWith("sb-") && key.includes("auth-token")) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key))
      } catch {
        // localStorage may be unavailable in strict contexts.
      }

      window.location.replace("/")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithPassword,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
