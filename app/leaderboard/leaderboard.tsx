"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import { useAuth } from "@/components/AuthProvider"
import type { LeaderboardEntry } from "@/lib/types"
import { Trophy } from "lucide-react"

type SortKey = "best_score" | "avg_score" | "session_count" | "project_count"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "best_score", label: "Best Score" },
  { key: "avg_score", label: "Avg Score" },
  { key: "session_count", label: "Contributions" },
  { key: "project_count", label: "Projects" },
]

function getScoreColor(score: number) {
  if (score >= 4) return "text-green-400"
  if (score >= 3) return "text-primary"
  if (score >= 2) return "text-amber-400"
  return "text-red-400"
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-sm font-mono text-muted-foreground w-6 text-center">#{rank}</span>
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [sort, setSort] = useState<SortKey>("best_score")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const { profile } = useAuth()
  const limit = 25

  const load = useCallback((pageNum: number, sortKey: SortKey, replace: boolean) => {
    setLoading(true)
    fetch(`/api/leaderboard?page=${pageNum}&limit=${limit}&sort=${sortKey}`)
      .then((res) => res.json())
      .then((data) => {
        const incoming = data.entries ?? []
        setEntries((prev) => replace ? incoming : [...prev, ...incoming])
        setHasMore(incoming.length === limit)
      })
      .finally(() => setLoading(false))
  }, [limit])

  useEffect(() => {
    setPage(1)
    setEntries([])
    load(1, sort, true)
  }, [sort, load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, sort, false)
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold text-foreground">The Slate</h1>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg p-1 w-fit">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sort === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <p>No competitors yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => {
              const rank = (page - 1) * limit + i + 1
              const isMe = profile?.handle === e.handle
              return (
                <Link
                  key={e.id}
                  href={`/profile/${e.handle}`}
                  className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/20"
                >
                  {/* Rank */}
                  <div className="w-8 flex items-center justify-center shrink-0">
                    <RankBadge rank={rank} />
                  </div>

                  {/* Avatar */}
                  {e.avatar_url ? (
                    <img src={e.avatar_url} alt="" className="w-9 h-9 rounded-full border border-border shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">
                        {(e.display_name || e.handle)[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {e.display_name || e.handle}
                      </span>
                      {isMe && (
                        <span className="text-xs text-muted-foreground shrink-0">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.session_count} session{e.session_count !== 1 ? "s" : ""} · {e.project_count} project{e.project_count !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Avg</p>
                      <p className={`text-sm font-semibold tabular-nums ${getScoreColor(Number(e.avg_score))}`}>
                        {Number(e.avg_score).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Best</p>
                      <p className={`text-sm font-semibold tabular-nums ${getScoreColor(Number(e.best_score))}`}>
                        {Number(e.best_score).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
