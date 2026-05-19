"use client"

import { useState } from "react"
import { Check, Pencil, Share2 } from "lucide-react"
import { ShareCard } from "@/components/ShareCard"
import UploadZone from "@/components/UploadZone"
import PercentileBadge from "@/components/PercentileBadge"
import CLISetup from "@/components/CLISetup"

type ProfileClientProps = {
  profile: {
    id: string
    handle: string
    display_name: string | null
    avatar_url: string | null
  }
  leaderboard?:
    | {
        best_score: number
        avg_score: number
        session_count: number
        project_count?: number
        percentile_display: number
        rank: number
      }
    | null
  isOwner: boolean
  workspaceMode?: "personal" | "org"
  orgSlug?: string | null
  orgName?: string | null
  showCLISetup?: boolean
}

export default function ProfileClient({
  profile,
  leaderboard,
  isOwner,
  workspaceMode = "personal",
  orgSlug = null,
  orgName = null,
  showCLISetup = false,
}: ProfileClientProps) {
  const [showShare, setShowShare] = useState(false)

  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [handleInput, setHandleInput] = useState(profile.handle)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const uploadZoneHeight = "auto"

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${baseUrl}/profile/${profile.handle}`

  const effectiveName = displayName.trim() || profile.display_name || profile.handle

  function getScoreColor(score: number) {
    if (score >= 4) return "text-green-400"
    if (score >= 3) return "text-primary"
    if (score >= 2) return "text-amber-400"
    return "text-red-400"
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    setSaveError(null)
    setSaveSuccess(false)
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handleInput.trim().toLowerCase().replace(/\s+/g, "-") || undefined,
          display_name: displayName.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save")
        return
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      if (typeof window !== "undefined") {
        window.location.reload()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleProjectComplete = (projectId: string) => {
    if (typeof window !== "undefined") {
      if (workspaceMode === "org" && orgSlug) {
        window.location.href = `/org/${orgSlug}/project/${projectId}`
        return
      }
      window.location.href = `/project/${projectId}`
    }
  }

  return (
    <form
      onSubmit={isOwner ? saveProfile : undefined}
      className="flex items-start justify-between gap-6 flex-nowrap"
    >
      {/* Left column: profile + stats (stats tight under profile) */}
      <div className="flex flex-col gap-2 w-96">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border-2 border-border bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {effectiveName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            {isOwner && isEditingProfile ? (
              <>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="bg-transparent text-2xl font-bold text-foreground border-none focus:outline-none focus:ring-0 px-0"
                />
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-muted-foreground">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder="handle"
                    className="bg-transparent text-sm text-muted-foreground font-mono border-b border-border/60 focus:outline-none focus:ring-0 px-0 pb-0.5"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{effectiveName}</h1>
                  <p className="text-muted-foreground">@{isOwner ? handleInput : profile.handle}</p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    aria-label="Edit name and handle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {leaderboard && (
              <div className="mt-2">
                <PercentileBadge percentile={leaderboard.percentile_display} />
              </div>
            )}
          </div>
        </div>

        {/* Stats box: same width as upload, tight under profile */}
        {leaderboard && (
          <div className="w-96">
            <div className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-4 flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Best score</p>
                <p className={`text-2xl font-bold ${getScoreColor(Number(leaderboard.best_score))}`}>
                  {Number(leaderboard.best_score).toFixed(1)}
                  <span className="text-sm text-muted-foreground font-normal"> / 5</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg score</p>
                <p className={`text-2xl font-bold ${getScoreColor(Number(leaderboard.avg_score))}`}>
                  {Number(leaderboard.avg_score).toFixed(1)}
                  <span className="text-sm text-muted-foreground font-normal"> / 5</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rank on The Slate</p>
                <p className="text-2xl font-bold text-primary">#{leaderboard.rank}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contributions</p>
                <p className="text-2xl font-bold text-foreground">{leaderboard.session_count}</p>
              </div>
            </div>
          </div>
        )}

        {/* CLI Setup */}
        {showCLISetup && isOwner && workspaceMode === "personal" && (
          <div className="w-96">
            <CLISetup />
          </div>
        )}
      </div>

      {/* Right column: upload zone in line with profile; Share/Save absolute top-right when owner */}
      <div className="relative flex flex-col items-end w-96 self-start shrink-0">
        {isOwner && (
          <div className="flex items-center gap-2 mb-3">
            {workspaceMode === "org" && orgName && (
              <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                Org mode: {orgName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {isEditingProfile && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" /> Saved
                  </>
                ) : saving ? (
                  "Saving…"
                ) : (
                  "Save"
                )}
              </button>
            )}
          </div>
        )}

        {isOwner ? (
          <div
            className="w-full flex flex-col rounded-lg"
            style={{ minHeight: "9rem" }}
          >
            <UploadZone
              compact
              className="h-full"
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
              onProjectComplete={handleProjectComplete}
              fileName={uploadFileName}
              setFileName={setUploadFileName}
              orgContext={workspaceMode === "org" && orgSlug ? { slug: orgSlug } : undefined}
            />
            {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        )}
        {showShare && (
          <ShareCard
            title={`${profile.handle} on Slait`}
            url={url}
            percentile={leaderboard?.percentile_display}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </form>
  )
}
