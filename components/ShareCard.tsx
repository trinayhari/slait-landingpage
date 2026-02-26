"use client"

import { useState } from "react"
import { Copy, Check, Share2, X } from "lucide-react"
import { getOrdinal } from "./PercentileBadge"

type ShareOption = "full" | "summary" | "badge"

interface ShareCardProps {
  title: string
  url: string
  percentile?: number
  onClose: () => void
}

export function ShareCard({ title, url, percentile, onClose }: ShareCardProps) {
  const [copied, setCopied] = useState(false)
  const [option, setOption] = useState<ShareOption>("full")

  const shareUrl = option === "full" ? url : url
  const text =
    option === "badge" && percentile != null
      ? `I'm in the ${getOrdinal(percentile)} percentile of AI-native engineers on Slait. Check your session analysis: ${url}`
      : option === "summary"
        ? `My AI coding session analysis on Slait: ${url}`
        : `My AI coding session analysis on Slait: ${url}`

  const copyLink = () => {
    const toCopy = option === "badge" && percentile != null ? text : shareUrl
    navigator.clipboard.writeText(toCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const twitterUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({
    text,
    url: shareUrl,
  })}`
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {percentile != null && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Share as</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setOption("full")}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  option === "full"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                Full breakdown
              </button>
              <button
                type="button"
                onClick={() => setOption("summary")}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  option === "summary"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setOption("badge")}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  option === "badge"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                Percentile badge
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={option === "badge" && percentile != null ? text : shareUrl}
            className="flex-1 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-foreground hover:bg-secondary/80 flex items-center gap-1"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg border border-border bg-card py-2 text-center text-sm text-foreground hover:bg-secondary"
          >
            X (Twitter)
          </a>
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg border border-border bg-card py-2 text-center text-sm text-foreground hover:bg-secondary"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  )
}
