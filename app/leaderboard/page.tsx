"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import { useAuth } from "@/components/AuthProvider"
import type { LeaderboardEntry } from "@/lib/types"

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const { profile } = useAuth()
  const limit = 20

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leaderboard?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries((prev) => (page === 1 ? data.entries ?? [] : [...prev, ...(data.entries ?? [])]))
        setHasMore((data.entries?.length ?? 0) === limit)
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground">
          Top AI-native engineers by session score. Opt in via your{" "}
          <Link href="/dashboard/settings" className="text-primary hover:underline">
            dashboard settings
          </Link>
          .
        </p>

        {loading && entries.length === 0 ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-border bg-card/50 p-8 text-center text-muted-foreground">
            No public entries yet. Be the first to go public and rank.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Rank</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Handle</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Best score</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Sessions</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className={`border-b border-border last:border-0 ${
                        profile?.handle === e.handle ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">#{e.rank}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/profile/${e.handle}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {e.display_name || e.handle}
                        </Link>
                        {profile?.handle === e.handle && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {Number(e.best_score).toFixed(1)} / 5
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.session_count}</td>
                      <td className="px-4 py-3 text-primary font-medium">
                        {e.percentile_display}th
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
