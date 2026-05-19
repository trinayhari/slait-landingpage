"use client"

import { useRouter } from "next/navigation"
import AnalysisResults from "@/components/AnalysisResults"
import type { AIUsageAnalysis } from "@/lib/types"

interface Props {
  analysis: AIUsageAnalysis
  sessionId: string
}

export default function SessionAnalysisClient({ analysis, sessionId }: Props) {
  const router = useRouter()
  return (
    <AnalysisResults
      analysis={analysis}
      onReset={() => router.push("/")}
      savedSessionId={sessionId}
    />
  )
}
