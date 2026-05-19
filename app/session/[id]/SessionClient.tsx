"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { ShareCard } from "@/components/ShareCard"

type SessionClientProps = {
  sessionId: string
  overallScore?: number | null
}

export default function SessionClient({ sessionId, overallScore }: SessionClientProps) {
  const [showShare, setShowShare] = useState(false)
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${baseUrl}/session/${sessionId}`
  const scoreLabel =
    typeof overallScore === "number" ? `${overallScore.toFixed(1)}/5` : "\u2014/5"

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Session <span className="text-foreground">· {scoreLabel}</span>
      </p>
      <button
        type="button"
        onClick={() => setShowShare(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
      {showShare && (
        <ShareCard
          title="Session"
          url={url}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
