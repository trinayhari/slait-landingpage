"use client"

import { FormEvent, useEffect, useState } from "react"
import Header from "@/components/Header"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
}

export default function NewOrgPage() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [membershipsLoading, setMembershipsLoading] = useState(true)
  const [existingOrg, setExistingOrg] = useState<{ slug: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadMemberships() {
      try {
        const res = await fetch("/api/orgs")
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error ?? "Failed to load organizations")
        const firstMembership = data?.memberships?.[0]?.organization
        if (!cancelled && firstMembership?.slug && firstMembership?.name) {
          setExistingOrg({ slug: firstMembership.slug, name: firstMembership.name })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load organizations")
        }
      } finally {
        if (!cancelled) setMembershipsLoading(false)
      }
    }

    void loadMemberships()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (existingOrg) return
    setError(null)
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slugify(slug || name),
      }
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? "Failed to create organization")
      window.location.href = `/org/${data.slug}`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5 space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Create organization</h1>
          <p className="text-sm text-muted-foreground">
            Personal routes stay unchanged. This creates a parallel `/org/[slug]` workspace.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Organization name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading || membershipsLoading || Boolean(existingOrg)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                placeholder="Acme Engineering"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={loading || membershipsLoading || Boolean(existingOrg)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                placeholder={slugify(name) || "acme-engineering"}
              />
            </div>
            {existingOrg && (
              <p className="text-xs text-amber-300">
                You already belong to <span className="font-medium">{existingOrg.name}</span>. You can only belong
                to one organization right now. Go to <span className="font-medium">/org/{existingOrg.slug}</span>.
              </p>
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || membershipsLoading || Boolean(existingOrg)}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {membershipsLoading ? "Checking..." : loading ? "Creating..." : "Create organization"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
