"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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

export default function OrgLeaderboardClient({
  orgSlug,
  orgName,
  entries,
}: {
  orgSlug: string
  orgName: string
  entries: LeaderboardEntry[]
}) {
  const [sort, setSort] = useState<SortKey>("best_score")

  const sortedEntries = useMemo(() => {
    const next = [...entries]
    next.sort((a, b) => {
      if (sort === "session_count" || sort === "project_count") {
        return Number(b[sort]) - Number(a[sort])
      }
      return Number(b[sort]) - Number(a[sort])
    })
    return next
  }, [entries, sort])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-yellow-400" />
        <h1 className="text-2xl font-bold text-foreground">The Slate</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">{orgName}</p>

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

      {sortedEntries.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p>No competitors yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, index) => {
            const rank = index + 1
            return (
              <Link
                key={entry.id}
                href={`/profile/${entry.handle}?org=${orgSlug}`}
                className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/20"
              >
                <div className="w-8 flex items-center justify-center shrink-0">
                  <RankBadge rank={rank} />
                </div>

                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full border border-border shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">
                      {(entry.display_name || entry.handle)[0].toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {entry.display_name || entry.handle}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.session_count} session{entry.session_count !== 1 ? "s" : ""} · {entry.project_count} project
                    {entry.project_count !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Avg</p>
                    <p className={`text-sm font-semibold tabular-nums ${getScoreColor(Number(entry.avg_score))}`}>
                      {Number(entry.avg_score).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className={`text-sm font-semibold tabular-nums ${getScoreColor(Number(entry.best_score))}`}>
                      {Number(entry.best_score).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
