"use client"

import { useState } from "react"
import Link from "next/link"
import { Share2 } from "lucide-react"
import { ShareCard } from "@/components/ShareCard"

export default function SessionClient({ sessionId }: { sessionId: string }) {
  const [showShare, setShowShare] = useState(false)
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${baseUrl}/session/${sessionId}`

  return (
    <div className="flex items-center justify-between mb-6">
      <Link
        href="/leaderboard"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Leaderboard
      </Link>
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
