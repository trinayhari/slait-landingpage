"use client"

import { useEffect, useState } from "react"
import Header from "@/components/Header"

export default function OrgInvitePage() {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [existingOrg, setExistingOrg] = useState<{ slug: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token"))

    async function loadMemberships() {
      const res = await fetch("/api/orgs")
      const data = await res.json().catch(() => null)
      if (!res.ok) return
      const firstMembership = data?.memberships?.[0]?.organization
      if (!cancelled && firstMembership?.slug && firstMembership?.name) {
        setExistingOrg({ slug: firstMembership.slug, name: firstMembership.name })
      }
    }

    void loadMemberships()
    return () => {
      cancelled = true
    }
  }, [])

  async function acceptInvite() {
    if (!token) return
    setLoading(true)
    setError(null)
    const res = await fetch("/api/orgs/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? "Failed to accept invite")
      setLoading(false)
      return
    }
    if (data?.slug) {
      window.location.href = `/org/${data.slug}`
      return
    }
    window.location.href = "/"
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-xl mx-auto px-4 py-8">
        <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5 space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Organization invite</h1>
          {!token ? (
            <p className="text-sm text-red-400">Missing invite token.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Accept this invite to join organization workspace access.
              </p>
              {existingOrg && (
                <p className="text-xs text-amber-300">
                  You are already in <span className="font-medium">{existingOrg.name}</span>. You can only belong to
                  one organization right now, so this invite will only work if it is for the same organization.
                </p>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="button"
                onClick={acceptInvite}
                disabled={loading}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Accepting..." : "Accept invite"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
