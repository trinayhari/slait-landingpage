import type { SupabaseClient } from "@supabase/supabase-js"
import type { ModuleEvalResult, ModuleScore } from "@/lib/types"

export async function refreshProjectScore(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single()

  if (!project) return

  const { data: sessions } = await supabase
    .from("sessions")
    .select("overall_score, module_eval, strengths, weaknesses, detected_patterns, confidence")
    .eq("project_id", projectId)
    .eq("status", "complete")
    .not("overall_score", "is", null)

  if (!sessions || sessions.length === 0) return

  const count = sessions.length
  const overallScore =
    sessions.reduce((sum, s) => sum + Number(s.overall_score ?? 0), 0) / count

  const moduleEval = aggregateModuleEvals(
    sessions
      .map((s) => s.module_eval as ModuleEvalResult | null)
      .filter((m): m is ModuleEvalResult => m != null)
  )

  const dimensionScores = moduleEval
    ? buildDimensionScores(moduleEval)
    : null

  const strengths = topItems(
    sessions.flatMap((s) => (Array.isArray(s.strengths) ? s.strengths : [])),
    5
  )
  const weaknesses = topItems(
    sessions.flatMap((s) => (Array.isArray(s.weaknesses) ? s.weaknesses : [])),
    5
  )
  const detectedPatterns = topItems(
    sessions.flatMap((s) => (Array.isArray(s.detected_patterns) ? s.detected_patterns : [])),
    6
  )

  const confidence =
    overallScore >= 4 || count >= 4 ? "High" : overallScore >= 2.5 ? "Medium" : "Low"
  const hireSignal =
    overallScore >= 4 ? "Strong Yes" : overallScore >= 2 ? "Borderline" : "No"

  const summary = `Project ${project.name} analyzed across ${count} session${count === 1 ? "" : "s"}. Aggregate score ${overallScore.toFixed(2)}/5.`

  await supabase
    .from("projects")
    .update({
      overall_score: overallScore,
      confidence,
      hire_signal: hireSignal,
      dimension_scores: dimensionScores,
      module_eval: moduleEval,
      summary,
      strengths,
      weaknesses,
      detected_patterns: detectedPatterns,
    })
    .eq("id", projectId)
}

function aggregateModuleEvals(evals: ModuleEvalResult[]): ModuleEvalResult | null {
  if (evals.length === 0) return null

  const allModuleIds = new Set<string>()
  for (const e of evals) {
    for (const id of Object.keys(e.module_scores)) {
      allModuleIds.add(id)
    }
  }

  const aggregatedScores: Record<string, ModuleScore> = {}
  const aggregatedWeights: Record<string, number> = {}

  for (const moduleId of allModuleIds) {
    const scores = evals
      .map((e) => e.module_scores[moduleId])
      .filter((s): s is ModuleScore => s != null)

    if (scores.length === 0) continue

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    const combinedEvidence = scores.flatMap((s) => s.evidence).slice(0, 3)
    const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length

    aggregatedScores[moduleId] = {
      module_id: moduleId,
      score: avgScore,
      evidence: combinedEvidence,
      explanation: scores[scores.length - 1].explanation,
      confidence: avgConfidence,
      fallback: scores.every((s) => s.fallback),
    }

    const weights = evals.map((e) => e.weights[moduleId]).filter((w): w is number => w != null)
    aggregatedWeights[moduleId] =
      weights.length > 0 ? weights.reduce((sum, w) => sum + w, 0) / weights.length : 0
  }

  let scoreWeightSum = 0
  let weightSum = 0
  for (const [moduleId, score] of Object.entries(aggregatedScores)) {
    const weight = aggregatedWeights[moduleId] ?? 0
    scoreWeightSum += score.score * weight
    weightSum += weight
  }
  const weightedTotal = weightSum > 0 ? scoreWeightSum / weightSum : 0

  return {
    module_scores: aggregatedScores,
    weights: aggregatedWeights,
    weighted_total: weightedTotal,
    hire_signal:
      weightedTotal >= 4 ? "Strong Yes" : weightedTotal >= 3 ? "Yes" : "No",
    evaluator_version: evals[0].evaluator_version,
  }
}

function buildDimensionScores(moduleEval: ModuleEvalResult) {
  const numAvg = (values: (number | undefined)[]) => {
    const nums = values.filter((v): v is number => typeof v === "number")
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
  }

  return {
    planning: moduleEval.module_scores.planning?.score ?? 0,
    promptIteration: numAvg([
      moduleEval.module_scores.iteration?.score,
      moduleEval.module_scores.repetition?.score,
    ]),
    debugging: moduleEval.module_scores.debugging?.score ?? 0,
    toolControl: moduleEval.module_scores.tool_usage?.score ?? 0,
    engineeringJudgment: numAvg([
      moduleEval.module_scores.constraints?.score,
      moduleEval.module_scores.correction?.score,
      moduleEval.module_scores.understanding?.score,
    ]),
  }
}

function topItems(items: string[], limit: number) {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value)
}
