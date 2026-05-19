"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type ProjectSession = {
  id: string
  source: string
  session_label: string | null
  file_name: string | null
  overall_score: number | null
  status?: "in_progress" | "complete"
  created_at: string
}

type ProjectPayload = {
  id: string
  name: string
  summary: string | null
  overall_score: number | null
  is_public: boolean
  is_owner: boolean
  sessions: ProjectSession[]
  sources_used?: string[]
}

const SOURCE_LABELS: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude",
  chatgpt: "Codex",
  copilot: "Copilot",
  windsurf: "Windsurf",
  other: "Other",
}

function getScoreColor(score: number) {
  if (score >= 4) return "text-green-400"
  if (score >= 3) return "text-primary"
  if (score >= 2) return "text-amber-400"
  return "text-red-400"
}

type Props = {
  projectId: string
  apiBasePath?: string
  orgSlug?: string
}

export default function ProjectDataLoader({
  projectId,
  apiBasePath = "/api",
  orgSlug,
}: Props) {
  const router = useRouter()
  const [project, setProject] = useState<ProjectPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    setError(null)
    setProject(null)

    fetch(`${apiBasePath}/projects/${projectId}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          const message =
            (payload as { error?: string } | null)?.error ?? "Project not found or you don't have access."
          throw new Error(message)
        }
        if (!isCancelled) {
          setProject(payload as ProjectPayload)
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project.")
        }
      })

    return () => {
      isCancelled = true
    }
  }, [apiBasePath, projectId])

  const sourceLabels = useMemo(() => {
    if (!project) return []
    const sources = project.sources_used && project.sources_used.length > 0 ? project.sources_used : []
    return sources.map((source) => SOURCE_LABELS[source] ?? source)
  }, [project])

  if (error) {
    return <p className="text-red-400 py-8 text-center">{error}</p>
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-primary/30 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <section className="max-w-5xl mx-auto space-y-6">
      <div className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{project.name}</h1>
            {project.summary ? (
              <p className="text-sm text-muted-foreground">{project.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No project summary yet.</p>
            )}
            {sourceLabels.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {sourceLabels.map((label) => (
                  <span key={label} className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Project score</p>
            <p className={`text-xl font-bold ${getScoreColor(Number(project.overall_score ?? 0))}`}>
              {project.overall_score != null ? `${Number(project.overall_score).toFixed(1)}/5` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
        {project.sessions.length === 0 ? (
          <p className="text-muted-foreground">No sessions in this project yet.</p>
        ) : (
          <ul className="space-y-3">
            {project.sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => router.push(`/session/${session.id}${orgSlug ? `?org=${orgSlug}` : ""}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    router.push(`/session/${session.id}${orgSlug ? `?org=${orgSlug}` : ""}`)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {session.session_label || session.file_name || "Untitled session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[session.source] ?? session.source} · {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(Number(session.overall_score ?? 0))}`}>
                    {session.overall_score != null ? `${Number(session.overall_score).toFixed(1)}/5` : "N/A"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
