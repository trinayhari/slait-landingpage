import { createClient } from "@/lib/supabase/server"
import type { AIUsageAnalysis } from "@/lib/types"

export async function getPublicSession(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .single()

  if (error || !data) return null

  const s = data
  const analysis: AIUsageAnalysis = {
    overallScore: Number(s.overall_score),
    confidence: s.confidence as "High" | "Medium" | "Low",
    dimensionScores: s.dimension_scores as AIUsageAnalysis["dimensionScores"],
    dimensionEvidence: s.dimension_evidence ?? undefined,
    strengths: Array.isArray(s.strengths) ? s.strengths : [],
    weaknesses: Array.isArray(s.weaknesses) ? s.weaknesses : [],
    detectedPatterns: Array.isArray(s.detected_patterns) ? s.detected_patterns : [],
    exampleEvidence: Array.isArray(s.example_evidence) ? s.example_evidence : [],
    hireSignal: s.hire_signal as AIUsageAnalysis["hireSignal"],
    summary: s.summary ?? "",
  }
  return { session: data, analysis }
}
