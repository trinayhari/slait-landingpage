"use client"

import { FormEvent, use, useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"

type Member = {
  user_id: string
  role: "admin" | "member"
  profile: {
    id: string
    handle: string
    display_name: string | null
  }
}

type Props = { params: Promise<{ slug: string }> }

export default function OrgMembersPage({ params }: Props) {
  const { slug } = use(params)
  const [members, setMembers] = useState<Member[]>([])
  const [viewerRole, setViewerRole] = useState<"admin" | "member">("member")
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/orgs/${slug}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.members)) {
          setMembers(data.members)
          setViewerRole(data.viewer_role === "admin" ? "admin" : "member")
        } else {
          setError(data.error ?? "Failed to load members")
        }
      })
      .catch(() => setError("Failed to load members"))
  }, [slug])

  async function invite(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInviteLink(null)
    const res = await fetch(`/api/orgs/${slug}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: inviteRole }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? "Failed to invite")
      return
    }
    const base = window.location.origin
    setInviteLink(`${base}/org/invite?token=${data.token}`)
    setEmail("")
  }

  async function changeRole(userId: string, role: "admin" | "member") {
    setError(null)
    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? "Failed to change role")
      return
    }
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)))
  }

  async function removeMember(userId: string) {
    setError(null)
    const res = await fetch(`/api/orgs/${slug}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setError(data?.error ?? "Failed to remove member")
      return
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5">
          <h1 className="text-2xl font-bold text-foreground">Organization members</h1>
          <p className="text-sm text-muted-foreground mt-1">/org/{slug}/members</p>
        </section>

        {viewerRole === "admin" && (
          <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Invite member</h2>
            <form onSubmit={invite} className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs text-muted-foreground">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                  placeholder="teammate@company.com"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
              >
                Create invite
              </button>
            </form>
            {inviteLink && (
              <p className="text-xs text-primary break-all">
                Invite link: {inviteLink}
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="rounded-lg border border-border px-3 py-2 flex items-center justify-between gap-3"
              >
                <div>
                  <Link
                    href={`/profile/${member.profile.handle}?org=${slug}`}
                    className="block text-sm text-foreground hover:underline"
                  >
                    {member.profile.display_name || member.profile.handle}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <Link href={`/profile/${member.profile.handle}?org=${slug}`} className="hover:underline">
                      @{member.profile.handle}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {viewerRole === "admin" ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.user_id, e.target.value as "admin" | "member")}
                        className="rounded border border-border bg-background/60 px-2 py-1 text-xs"
                      >
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMember(member.user_id)}
                        className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{member.role}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
