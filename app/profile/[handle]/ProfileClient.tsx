"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { ShareCard } from "@/components/ShareCard"

export default function ProfileClient({
  handle,
  percentile,
}: {
  handle: string
  percentile?: number
}) {
  const [showShare, setShowShare] = useState(false)
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://slait.dev"
  const url = `${baseUrl}/profile/${handle}`

  return (
    <>
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
          title={`${handle} on Slait`}
          url={url}
          percentile={percentile}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  )
}
