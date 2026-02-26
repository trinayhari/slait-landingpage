"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import { Session, LeaderboardEntry } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Trash2, Share2, Lock, Globe } from "lucide-react"

const SOURCE_LABELS: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude",
  chatgpt: "ChatGPT",
  copilot: "Copilot",
  windsurf: "Windsurf",
  other: "Other",
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [leaderboardMe, setLeaderboardMe] = useState<LeaderboardEntry | null | "none">(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [sessRes, lbRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/leaderboard/me").catch(() => ({ ok: false })),
      ])
      if (sessRes.ok) {
        const data = await sessRes.json()
        setSessions(Array.isArray(data) ? data : [])
      }
      if (lbRes.ok) {
        const data = await (lbRes as Response).json()
        setLeaderboardMe(data)
      } else {
        setLeaderboardMe("none")
      }
      setLoading(false)
    }
    load()
  }, [])

  const bestScore = sessions.length
    ? Math.max(...sessions.map((s) => Number(s.overall_score)))
    : null

  const toggleVisibility = async (id: string, current: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !current }),
      })
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_public: !current } : s))
        )
        if (leaderboardMe !== "none" && typeof leaderboardMe === "object") {
          const meRes = await fetch("/api/leaderboard/me")
          if (meRes.ok) setLeaderboardMe(await meRes.json())
          else setLeaderboardMe("none")
        } else {
          const meRes = await fetch("/api/leaderboard/me")
          if (meRes.ok) setLeaderboardMe(await meRes.json())
        }
      }
    } finally {
      setTogglingId(null)
    }
  }

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session?")) return
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
    if (res.ok) setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Best score</p>
                <p className="text-2xl font-bold text-foreground">
                  {bestScore != null ? `${Number(bestScore).toFixed(1)} / 5` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">Leaderboard</p>
                {leaderboardMe === null ? (
                  <p className="text-muted-foreground">—</p>
                ) : leaderboardMe === "none" ? (
                  <p className="text-sm text-muted-foreground">
                    Opt in via Settings & public sessions
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-primary">
                    #{leaderboardMe.rank} · {leaderboardMe.percentile_display}th %
                  </p>
                )}
              </div>
            </div>

            {typeof leaderboardMe === "object" && leaderboardMe !== null && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
                <p className="text-sm text-foreground">
                  Your public profile:{" "}
                  <Link
                    href={`/profile/${leaderboardMe.handle}`}
                    className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                  >
                    slait.dev/profile/{leaderboardMe.handle}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your sessions</h2>
              <Link
                href="/"
                className="text-sm text-primary hover:underline"
              >
                Analyze another
              </Link>
            </div>

            {sessions.length === 0 ? (
              <div className="rounded-lg border border-border bg-card/50 p-8 text-center text-muted-foreground">
                <p>No sessions yet.</p>
                <Link href="/" className="text-primary hover:underline mt-2 inline-block">
                  Upload a session
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-border bg-card/50 p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-foreground">
                        {Number(s.overall_score).toFixed(1)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {s.file_name || "Session"} · {SOURCE_LABELS[s.source] ?? s.source}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(s.id, s.is_public)}
                        disabled={togglingId === s.id}
                        className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-1"
                        title={s.is_public ? "Make private" : "Make public"}
                      >
                        {s.is_public ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {s.is_public ? "Public" : "Private"}
                      </button>
                      <Link
                        href={`/session/${s.id}`}
                        className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-1"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteSession(s.id)}
                        className="rounded border border-red-500/40 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-sm text-muted-foreground">
              <Link href="/dashboard/settings" className="text-primary hover:underline">
                Settings
              </Link>
              {" "}· Handle, display name, and leaderboard visibility
            </p>
          </>
        )}
      </div>
    </main>
  )
}
