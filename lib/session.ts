import { createClient } from "@/lib/supabase/server"
import type { AIUsageAnalysis } from "@/lib/types"

/**
 * Lightweight session lookup — only fetches columns needed for page metadata.
 * Avoids pulling annotated_turns / dimension_evidence which can be several MB.
 */
export async function getSessionMeta(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("sessions")
    .select("id, overall_score, summary")
    .eq("id", id)
    .single()
  return data ?? null
}

/**
 * Returns session if: (a) it's public, or (b) the current user owns it.
 * RLS enforces: public sessions are readable by all; private only by owner.
 */
export async function getSession(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null

  const s = data
  const analysis: AIUsageAnalysis = {
    overallScore: Number(s.overall_score),
    confidence: s.confidence as "High" | "Medium" | "Low",
    dimensionScores: s.dimension_scores as AIUsageAnalysis["dimensionScores"],
    dimensionEvidence: s.dimension_evidence ?? undefined,
    moduleEval: s.module_eval ?? undefined,
    annotatedTurns: s.annotated_turns ?? undefined,
    strengths: Array.isArray(s.strengths) ? s.strengths : [],
    weaknesses: Array.isArray(s.weaknesses) ? s.weaknesses : [],
    detectedPatterns: Array.isArray(s.detected_patterns) ? s.detected_patterns : [],
    exampleEvidence: Array.isArray(s.example_evidence) ? s.example_evidence : [],
    hireSignal: s.hire_signal as AIUsageAnalysis["hireSignal"],
    summary: s.summary ?? "",
  }
  return { session: data, analysis }
}
