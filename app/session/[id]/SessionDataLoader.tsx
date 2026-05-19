"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AnalysisResults from "@/components/AnalysisResults"
import type { AIUsageAnalysis } from "@/lib/types"
import { rowToAnalysis } from "@/lib/analysisMapper"

export default function SessionDataLoader({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<AIUsageAnalysis | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) { setError(true); return null }
        return res.json()
      })
      .then((data) => {
        if (data) setAnalysis(rowToAnalysis(data))
      })
      .catch(() => setError(true))
  }, [sessionId])

  if (error) {
    return (
      <p className="text-red-400 py-8 text-center">
        Session not found or you don&apos;t have access.
      </p>
    )
  }

  if (!analysis) {
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
    <AnalysisResults
      analysis={analysis}
      onReset={() => router.push("/")}
      savedSessionId={sessionId}
    />
  )
}
