"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Project } from "@/lib/types"

const SOURCE_LABELS: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude",
  chatgpt: "Codex",
  copilot: "Copilot",
  windsurf: "Windsurf",
  other: "Other",
}

type ProjectWithSources = Pick<Project, "id" | "name" | "source" | "overall_score" | "created_at" | "is_public"> & {
  sources_used?: string[]
}

interface Props {
  projects: ProjectWithSources[]
  isOwner: boolean
  projectHrefPrefix?: string
  projectApiPrefix?: string
  sectionTitle?: string
}

function getScoreColor(score: number) {
  if (score >= 4) return "text-green-400"
  if (score >= 3) return "text-primary"
  if (score >= 2) return "text-amber-400"
  return "text-red-400"
}

export default function ProfileProjectsClient({
  projects,
  isOwner,
  projectHrefPrefix = "/project",
  projectApiPrefix = "/api/projects",
  sectionTitle = "Projects",
}: Props) {
  const router = useRouter()
  const [localProjects, setLocalProjects] = useState(projects)
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLocalProjects(projects)
  }, [projects])

  async function toggleProjectVisibility(projectId: string, isPublic: boolean) {
    if (!isOwner || updatingProjectId) return
    setError(null)
    setUpdatingProjectId(projectId)
    const nextIsPublic = !isPublic

    try {
      const res = await fetch(`${projectApiPrefix}/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: nextIsPublic }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? "Failed to update project visibility")
      }
      setLocalProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, is_public: nextIsPublic } : project
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project visibility")
    } finally {
      setUpdatingProjectId(null)
    }
  }

  async function deleteProject(projectId: string, projectName: string) {
    if (!isOwner || deletingProjectId) return
    if (!confirm(`Delete project "${projectName}"? This cannot be undone. Sessions in this project will become unlinked.`)) return
    setError(null)
    setDeletingProjectId(projectId)
    try {
      const res = await fetch(`${projectApiPrefix}/${projectId}`, { method: "DELETE" })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? "Failed to delete project")
      }
      setLocalProjects((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project")
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{sectionTitle}</h2>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {localProjects.length === 0 ? (
        <p className="text-muted-foreground">No projects yet.</p>
      ) : (
        <ul className="space-y-3">
          {localProjects.map((project) => {
            const canOpen = isOwner || project.is_public
            return (
            <li
              key={project.id}
              className={`rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-4 transition-colors ${
                canOpen ? "cursor-pointer hover:bg-secondary/30" : "opacity-90 cursor-not-allowed"
              }`}
              onClick={() => {
                if (!canOpen) return
                router.push(`${projectHrefPrefix}/${project.id}`)
              }}
              onKeyDown={(e) => {
                if (!canOpen) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  router.push(`${projectHrefPrefix}/${project.id}`)
                }
              }}
              role={canOpen ? "button" : "article"}
              tabIndex={canOpen ? 0 : -1}
              title={canOpen ? undefined : "Private project details are only visible to the owner"}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{project.name}</p>
                    {(project.sources_used && project.sources_used.length > 1
                      ? project.sources_used
                      : [project.source]
                    ).map((src) => (
                      <span key={src} className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {SOURCE_LABELS[src] ?? src}
                      </span>
                    ))}
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleProjectVisibility(project.id, project.is_public)
                          }}
                          disabled={updatingProjectId === project.id}
                          className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded hover:bg-secondary/70 disabled:opacity-50"
                          title="Toggle project visibility"
                        >
                          {updatingProjectId === project.id
                            ? "Updating..."
                            : project.is_public
                            ? "Public"
                            : "Private"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteProject(project.id, project.name)
                          }}
                          disabled={deletingProjectId === project.id}
                          className="text-xs text-red-400/80 hover:text-red-400 px-2 py-0.5 rounded hover:bg-red-500/10 disabled:opacity-50"
                          title="Delete project"
                        >
                          {deletingProjectId === project.id ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {project.is_public ? "Public" : "Private"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  {canOpen ? (
                    <span className={`text-sm font-bold ${getScoreColor(Number(project.overall_score ?? 0))}`}>
                      {project.overall_score != null ? `${Number(project.overall_score).toFixed(1)}/5` : "N/A"}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Private details</span>
                  )}
                </div>
              </div>
            </li>
          )})}
        </ul>
      )}
    </section>
  )
}
