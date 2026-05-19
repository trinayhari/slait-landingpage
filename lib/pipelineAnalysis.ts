import type { PipelineResult } from "@recruiting-buddy/analysis"
import type { AIUsageAnalysis, AnnotatedTurn, ModuleEvalResult } from "@/lib/types"

export function pipelineResultToAnalysis(result: PipelineResult): AIUsageAnalysis {
  const { scoring, confidence, features, moduleEval: rawModuleEval, annotated_turns } = result
  const moduleEval = rawModuleEval ? removeInapplicableModules(rawModuleEval) : undefined
  const overallScore = moduleEval?.weighted_total ?? scoring.overall
  const confidenceLevel = confidence.level as "High" | "Medium" | "Low"

  const dimensionScores = moduleEval
    ? {
        planning: moduleEval.module_scores.planning?.score ?? scoring.dimensions.planning.score,
        promptIteration:
          avg([moduleEval.module_scores.iteration?.score, moduleEval.module_scores.repetition?.score]) ??
          scoring.dimensions.promptIteration.score,
        debugging: moduleEval.module_scores.debugging?.score ?? scoring.dimensions.debugging.score,
        toolControl: moduleEval.module_scores.tool_usage?.score ?? scoring.dimensions.toolControl.score,
        engineeringJudgment:
          avg([
            moduleEval.module_scores.constraints?.score,
            moduleEval.module_scores.correction?.score,
            moduleEval.module_scores.understanding?.score,
          ]) ?? scoring.dimensions.engineeringJudgment.score,
      }
    : {
        planning: scoring.dimensions.planning.score,
        promptIteration: scoring.dimensions.promptIteration.score,
        debugging: scoring.dimensions.debugging.score,
        toolControl: scoring.dimensions.toolControl.score,
        engineeringJudgment: scoring.dimensions.engineeringJudgment.score,
      }

  const { strengths, weaknesses } = moduleEval
    ? buildStrengthsWeaknesses(moduleEval)
    : { strengths: [], weaknesses: [] }

  const exampleEvidence = moduleEval ? buildExampleEvidence(moduleEval) : []
  const detectedPatterns = buildDetectedPatterns(features, result.phase_segments ?? [])

  const rawSignal = moduleEval?.hire_signal ?? scoring.hire_signal
  const hireSignal: AIUsageAnalysis["hireSignal"] =
    rawSignal === "Strong Yes" ? "Strong Yes" : rawSignal === "Yes" ? "Yes" : "No"

  const summary = buildSummary(features.normalization.total_events)

  const moduleEvalForStorage: ModuleEvalResult | undefined = moduleEval
    ? {
        module_scores: moduleEval.module_scores as ModuleEvalResult["module_scores"],
        weights: moduleEval.weights,
        weighted_total: moduleEval.weighted_total,
        hire_signal: moduleEval.hire_signal,
        evaluator_version: moduleEval.evaluator_version,
      }
    : undefined

  const annotatedTurns: AnnotatedTurn[] | undefined = annotated_turns?.map((t) => ({
    turn_id: t.turn_id,
    user_text: t.user_text,
    assistant_text: t.assistant_text,
    spans: (t.spans ?? [])
      .filter((s) => s.module_id !== "alignment")
      .map((s) => ({ module_id: s.module_id, start: s.start, end: s.end, label: s.module_id })),
    session_index: t.session_index,
  }))

  return {
    overallScore,
    confidence: confidenceLevel,
    dimensionScores,
    moduleEval: moduleEvalForStorage,
    annotatedTurns,
    strengths,
    weaknesses,
    detectedPatterns,
    exampleEvidence,
    hireSignal,
    summary,
  }
}

export function synthesizeProjectAnalysis(
  analyses: AIUsageAnalysis[],
  projectName: string,
  failedSessions = 0
): AIUsageAnalysis {
  const safeAnalyses = analyses.filter(Boolean)
  const count = safeAnalyses.length
  if (count === 0) {
    return {
      overallScore: 0,
      confidence: "Low",
      dimensionScores: {
        planning: 0,
        promptIteration: 0,
        debugging: 0,
        toolControl: 0,
        engineeringJudgment: 0,
      },
      strengths: [],
      weaknesses: ["No sessions could be analyzed"],
      detectedPatterns: [],
      exampleEvidence: [],
      hireSignal: "No",
      summary: `No analyzable sessions were found for project ${projectName}.`,
    }
  }

  const overallScore =
    safeAnalyses.reduce((sum, analysis) => sum + Number(analysis.overallScore || 0), 0) / count
  const dimensionScores = {
    planning: averageDimension(safeAnalyses, "planning"),
    promptIteration: averageDimension(safeAnalyses, "promptIteration"),
    debugging: averageDimension(safeAnalyses, "debugging"),
    toolControl: averageDimension(safeAnalyses, "toolControl"),
    engineeringJudgment: averageDimension(safeAnalyses, "engineeringJudgment"),
  }

  const strengths = topItems(safeAnalyses.flatMap((a) => a.strengths), 5)
  const weaknesses = topItems(safeAnalyses.flatMap((a) => a.weaknesses), 5)
  const detectedPatterns = topItems(safeAnalyses.flatMap((a) => a.detectedPatterns), 6)
  const exampleEvidence = safeAnalyses.flatMap((a) => a.exampleEvidence).slice(0, 8)

  const confidence: AIUsageAnalysis["confidence"] =
    overallScore >= 4 || count >= 4 ? "High" : overallScore >= 2.5 ? "Medium" : "Low"
  const hireSignal: AIUsageAnalysis["hireSignal"] =
    overallScore >= 4 ? "Strong Yes" : overallScore >= 3 ? "Yes" : overallScore >= 2 ? "Borderline" : "No"

  const summaryParts = [
    `Project ${projectName} analyzed across ${count} session${count === 1 ? "" : "s"}.`,
    `Aggregate score ${overallScore.toFixed(2)}/5.`,
  ]
  if (failedSessions > 0) {
    summaryParts.push(`${failedSessions} session${failedSessions === 1 ? "" : "s"} failed and were skipped.`)
  }

  return {
    overallScore,
    confidence,
    dimensionScores,
    strengths,
    weaknesses,
    detectedPatterns,
    exampleEvidence,
    hireSignal,
    summary: summaryParts.join(" "),
  }
}

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length)
  let currentIndex = 0

  const next = async () => {
    while (currentIndex < items.length) {
      const index = currentIndex
      currentIndex += 1
      try {
        const value = await worker(items[index], index)
        results[index] = { status: "fulfilled", value }
      } catch (error) {
        results[index] = { status: "rejected", reason: error }
      }
    }
  }

  const runners = Array.from({ length: Math.min(Math.max(concurrency, 1), items.length || 1) }, () => next())
  await Promise.all(runners)
  return results
}

function buildSummary(totalEvents: number) {
  let summary = `Analyzed ${totalEvents} conversation events.`
  return summary
}

function averageDimension(analyses: AIUsageAnalysis[], dimension: keyof AIUsageAnalysis["dimensionScores"]) {
  const values = analyses.map((analysis) => Number(analysis.dimensionScores?.[dimension] || 0))
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
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

function avg(values: (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => typeof v === "number")
  if (!nums.length) return undefined
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function removeInapplicableModules(moduleEval: NonNullable<PipelineResult["moduleEval"]>) {
  const filteredModuleScores = Object.fromEntries(
    Object.entries(moduleEval.module_scores).filter(([moduleId]) => moduleId !== "alignment")
  )
  const filteredWeights = Object.fromEntries(
    Object.entries(moduleEval.weights).filter(([moduleId]) => moduleId !== "alignment")
  )

  let weightedTotal = moduleEval.weighted_total
  let scoreWeightSum = 0
  let weightSum = 0
  for (const [moduleId, score] of Object.entries(filteredModuleScores)) {
    const weight = filteredWeights[moduleId] ?? 0
    scoreWeightSum += score.score * weight
    weightSum += weight
  }
  if (weightSum > 0) weightedTotal = scoreWeightSum / weightSum

  return {
    ...moduleEval,
    module_scores: filteredModuleScores,
    weights: filteredWeights,
    weighted_total: weightedTotal,
  }
}

function buildStrengthsWeaknesses(moduleEval: NonNullable<PipelineResult["moduleEval"]>) {
  const strengths: string[] = []
  const weaknesses: string[] = []
  for (const [id, score] of Object.entries(moduleEval.module_scores)) {
    if (score.score >= 4) strengths.push(`Strong ${id.replace(/_/g, " ")} (${score.score.toFixed(1)}/5)`)
    else if (score.score < 2) weaknesses.push(`Weak ${id.replace(/_/g, " ")} — ${score.explanation}`)
  }
  return { strengths, weaknesses }
}

function buildExampleEvidence(moduleEval: NonNullable<PipelineResult["moduleEval"]>) {
  return Object.values(moduleEval.module_scores)
    .filter((score) => score.evidence.length > 0 && !score.fallback)
    .sort((a, b) => Math.abs(b.score - 2.5) - Math.abs(a.score - 2.5))
    .slice(0, 6)
    .map((score) => ({
      behavior: score.evidence[0] ?? score.explanation,
      why_it_matters: `${score.module_id.replace(/_/g, " ")} score: ${score.score}/5 — ${score.explanation}`,
    }))
}

function buildDetectedPatterns(
  features: PipelineResult["features"],
  segments: PipelineResult["phase_segments"]
): string[] {
  const patterns: string[] = []
  const phaseOrder = (segments ?? []).map((segment) => segment.phase)
  if (phaseOrder.includes("planning") && phaseOrder.includes("implementation")) {
    patterns.push("Plan-then-implement workflow")
  }
  if (features.promptIteration.duplicate_prompt_rate > 0.2) {
    patterns.push("Prompt spam (high duplicate rate)")
  }
  if (features.promptIteration.refinement_trend > 0.3) {
    patterns.push("Deliberate prompt iteration")
  }
  if (features.debugging.root_cause_queries_count >= 3) {
    patterns.push("Root-cause investigation approach")
  }
  if (features.engineeringJudgment.tradeoff_statements >= 3) {
    patterns.push("Trade-off aware engineering")
  }
  if (features.toolControl.tools_explicitly_selected >= 5) {
    patterns.push("Active tool management")
  }
  if (features.promptIteration.similarity_between_consecutive_prompts > 0.85) {
    patterns.push("Possible vibecoding (repetitive prompts)")
  }
  return patterns
}
