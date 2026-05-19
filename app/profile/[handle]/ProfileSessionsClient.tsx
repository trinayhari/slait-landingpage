"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Session } from "@/lib/types"
import { Globe, Lock } from "lucide-react"

const SOURCE_LABELS: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude",
  chatgpt: "Codex",
  copilot: "Copilot",
  windsurf: "Windsurf",
  other: "Other",
}

const MODULE_SHORT: Record<string, string> = {
  planning: "Planning",
  debugging: "Debugging",
  constraints: "Constraints",
  iteration: "Iteration",
  correction: "Correction",
  tool_usage: "Tool Usage",
  alignment: "Alignment",
  repetition: "Repetition",
  understanding: "Understanding",
}

function getScoreColor(score: number) {
  if (score >= 4) return "text-green-400"
  if (score >= 3) return "text-primary"
  if (score >= 2) return "text-amber-400"
  return "text-red-400"
}

function getTopModules(
  dimensionScores: Record<string, unknown> | null,
  n = 3
): Array<{ id: string; label: string; score: number }> {
  if (!dimensionScores) return []
  const isModuleFormat = Object.keys(dimensionScores).some((k) => k in MODULE_SHORT)
  if (!isModuleFormat) return []
  return Object.entries(dimensionScores)
    .filter(([k]) => k in MODULE_SHORT)
    .map(([k, v]) => ({ id: k, label: MODULE_SHORT[k], score: Number(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

interface Props {
  sessions: Session[]
  isOwner: boolean
}

export default function ProfileSessionsClient({ sessions, isOwner }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<Session[]>(sessions)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const toggleVisibility = async (id: string, current: boolean) => {
    if (!isOwner) return
    setTogglingId(id)
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !current }),
      })
      if (res.ok) {
        setItems((prev) => prev.map((s) => (s.id === id ? { ...s, is_public: !current } : s)))
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No sessions yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => {
            const topModules = getTopModules(s.dimension_scores as Record<string, unknown> | null)
            const canViewDetails = s.is_public || isOwner
            const baseClassName = "flex items-start justify-between gap-4"
            const linkClassName = canViewDetails
              ? "cursor-pointer hover:bg-secondary/30 rounded-lg -m-4 p-4 transition-colors"
              : ""

            const content = (
              <>
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">
                      {s.file_name || "Session"}
                    </p>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {SOURCE_LABELS[s.source] ?? s.source}
                    </span>
                    {!s.is_public && (
                      <span
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        title="Private — only visible to owner"
                      >
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-sm font-bold ${getScoreColor(Number(s.overall_score))}`}>
                      {Number(s.overall_score).toFixed(1)}/5
                    </span>
                  </div>
                  {topModules.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      {topModules.map((m) => (
                        <span
                          key={m.id}
                          className="text-xs text-muted-foreground flex items-center gap-1"
                        >
                          <span className={`font-medium ${getScoreColor(m.score)}`}>
                            {m.score.toFixed(1)}
                          </span>
                          {m.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleVisibility(s.id, s.is_public)
                      }}
                      disabled={togglingId === s.id}
                      className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary flex items-center gap-1 transition-colors"
                      title={s.is_public ? "Make private" : "Make public (viewable by others)"}
                    >
                      {s.is_public ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {s.is_public ? "Public" : "Private"}
                    </button>
                  )}

                </div>
              </>
            )

            return (
              <li
                key={s.id}
                className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-4"
                onClick={canViewDetails ? () => router.push(`/session/${s.id}`) : undefined}
                onKeyDown={
                  canViewDetails
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          router.push(`/session/${s.id}`)
                        }
                      }
                    : undefined
                }
                role={canViewDetails ? "button" : undefined}
                tabIndex={canViewDetails ? 0 : undefined}
              >
                {canViewDetails ? (
                  <div className={`${baseClassName} ${linkClassName}`}>{content}</div>
                ) : (
                  <div className={baseClassName}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

