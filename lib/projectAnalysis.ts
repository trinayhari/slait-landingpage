import OpenAI from "openai"
import {
  annotateTurns,
  calculateConfidence,
  canonicalize,
  computeScores,
  evaluateModulesFromAnnotatedTurns,
  extractFeatures,
  getCurrentRubric,
  groupTurns,
} from "@recruiting-buddy/analysis"
import type { AnnotatedTurn as CoreAnnotatedTurn, CanonicalEvent } from "@recruiting-buddy/analysis"
import type { AIUsageAnalysis, ModuleEvalResult, SessionSource } from "@/lib/types"
import { runWithConcurrency } from "@/lib/pipelineAnalysis"
import { parseClaudeCodeTranscript, type DisplayMessage } from "@/lib/claudeCodeJsonl"

export type SessionInput = {
  sessionId?: string
  fileName: string
  sessionLabel?: string | null
  chatLog: string
  supplementaryFiles?: Record<string, string> | null
  source?: SessionSource
}

export type AnalyzeProjectsBody = {
  source: SessionSource
  projectName?: string
  sessions: SessionInput[]
  claudeMd?: string | null
  skillsFiles?: Record<string, string> | null
}

type SessionAnalysisOutput = {
  sessionId: string | null
  fileName: string
  sessionLabel: string | null
  chatLog: string
  supplementaryFiles: Record<string, string> | null
  analysis: AIUsageAnalysis
}

export async function analyzeProjectSessions(body: AnalyzeProjectsBody): Promise<{
  sessionAnalyses: SessionAnalysisOutput[]
  projectAnalysis: AIUsageAnalysis
  failedSessions: string[]
}> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("API key not configured")
  }

  const source = body?.source
  const sessions = Array.isArray(body?.sessions) ? body.sessions : []
  const claudeMd = typeof body?.claudeMd === "string" ? body.claudeMd : null
  const skillsFiles = body?.skillsFiles && typeof body.skillsFiles === "object" ? body.skillsFiles : null

  if (!source) throw new Error("source is required")
  if (sessions.length === 0) throw new Error("At least one session is required")

  const openai = createOpenAIClient()
  const rubric = getCurrentRubric()

  const claudeSupplementary: Record<string, string> = {}
  if (claudeMd?.trim()) claudeSupplementary["CLAUDE.md"] = claudeMd
  if (skillsFiles) {
    for (const [name, content] of Object.entries(skillsFiles)) {
      claudeSupplementary[name] = content
    }
  }

  const projectSupplementary: Record<string, string> = {}
  if (source === "claude") Object.assign(projectSupplementary, claudeSupplementary)

  // ── Step 1: Canonicalize + annotate all sessions in parallel ─────────────
  const annotationResults = await runWithConcurrency(sessions, 4, async (session) => {
    if (!session.chatLog?.trim()) throw new Error(`Session ${session.fileName} is empty`)

    const sessionSource = session.source ?? source
    const combinedSupplementary: Record<string, string> = { ...(session.supplementaryFiles ?? {}) }
    if (sessionSource === "claude") {
      Object.assign(combinedSupplementary, claudeSupplementary)
    } else {
      Object.assign(combinedSupplementary, projectSupplementary)
    }

    // Claude Code JSONL contains many synthetic user-role entries (tool
    // results, sub-agent prompts, system reminders). Strip them before
    // canonicalisation so they don't get scored as the human's prompts.
    const parsed = parseClaudeCodeTranscript(session.chatLog)
    const scoringInput = parsed ? parsed.scoringTranscript : session.chatLog
    const displayMessages: DisplayMessage[] | undefined = parsed?.messages

    const canonicalEvents = canonicalize(scoringInput)
    const groupedTurns = groupTurns(canonicalEvents)
    const annotatedTurns = openai ? await annotateTurns(groupedTurns, openai) : groupedTurns

    return {
      sessionId: session.sessionId ?? null,
      fileName: session.fileName,
      sessionLabel: session.sessionLabel ?? null,
      chatLog: session.chatLog,
      supplementaryFiles: Object.keys(combinedSupplementary).length ? combinedSupplementary : null,
      canonicalEvents,
      annotatedTurns,
      displayMessages,
    }
  })

  const fulfilled = annotationResults.filter(
    (entry): entry is PromiseFulfilledResult<{
      sessionId: string | null
      fileName: string
      sessionLabel: string | null
      chatLog: string
      supplementaryFiles: Record<string, string> | null
      canonicalEvents: CanonicalEvent[]
      annotatedTurns: CoreAnnotatedTurn[]
      displayMessages: DisplayMessage[] | undefined
    }> => entry.status === "fulfilled"
  )
  const rejected = annotationResults.filter(
    (entry): entry is PromiseRejectedResult => entry.status === "rejected"
  )

  if (fulfilled.length === 0) throw new Error("No sessions could be analyzed")

  // ── Step 2: Remap event/turn IDs for multi-session context ───────────────
  let eventOffset = 0
  let turnOffset = 0

  const remapped = fulfilled.map((entry, sessionIndex) => {
    const remappedEvents = entry.value.canonicalEvents.map((event) => ({
      ...event,
      event_id: event.event_id + eventOffset,
      session_index: sessionIndex,
    }))
    const remappedAnnotated = entry.value.annotatedTurns.map((turn) => ({
      ...turn,
      turn_id: turn.turn_id + turnOffset,
      user_event_id: turn.user_event_id + eventOffset,
      assistant_event_id:
        turn.assistant_event_id === null ? null : turn.assistant_event_id + eventOffset,
      session_index: sessionIndex,
      spans: (turn.spans ?? []).filter((s) => s.module_id !== "alignment"),
    }))

    eventOffset += entry.value.canonicalEvents.length
    turnOffset += entry.value.annotatedTurns.length

    return {
      ...entry.value,
      remappedEvents,
      remappedAnnotated,
    }
  })

  // ── Step 3: Score each session individually ──────────────────────────────
  // These results are reused for project scoring — no extra LLM pass needed.
  const scoredResults = await runWithConcurrency(remapped, 4, async (entry) => {
    const moduleEvalRaw = await evaluateModulesFromAnnotatedTurns(
      entry.remappedEvents,
      entry.remappedAnnotated,
      openai,
      undefined,
      undefined,
      Object.keys(projectSupplementary).length ? projectSupplementary : undefined
    )
    const moduleEval = removeInapplicableModules(moduleEvalRaw)
    const features = extractFeatures(entry.remappedEvents, [])
    const scoring = computeScores(features, rubric)
    const confidence = calculateConfidence([], features, [])

    const sessionAnalysis = projectAggregateToAnalysis(
      moduleEval,
      scoring,
      confidence.level as "High" | "Medium" | "Low",
      entry.remappedEvents.length
    )

    sessionAnalysis.annotatedTurns = entry.remappedAnnotated.map((turn) => ({
      turn_id: turn.turn_id,
      user_text: turn.user_text,
      assistant_text: turn.assistant_text,
      spans: turn.spans.map((span) => ({
        module_id: span.module_id,
        start: span.start,
        end: span.end,
        label: span.module_id,
      })),
      session_index: turn.session_index,
    }))
    sessionAnalysis.displayMessages = entry.displayMessages

    return {
      sessionId: entry.sessionId,
      fileName: entry.fileName,
      sessionLabel: entry.sessionLabel,
      chatLog: entry.chatLog,
      supplementaryFiles: entry.supplementaryFiles,
      moduleEval,
      analysis: sessionAnalysis,
    }
  })

  const scoredFulfilled = scoredResults
    .filter((r): r is PromiseFulfilledResult<{
      sessionId: string | null
      fileName: string
      sessionLabel: string | null
      chatLog: string
      supplementaryFiles: Record<string, string> | null
      moduleEval: ModuleEvalResult
      analysis: AIUsageAnalysis
    }> => r.status === "fulfilled")
    .map((r) => r.value)

  if (scoredFulfilled.length === 0) throw new Error("No sessions could be scored")

  // ── Step 4: Derive project score — no extra LLM calls ───────────────────
  // Single session: reuse its score directly.
  // Multiple sessions: average module scores across sessions.
  let projectAnalysis: AIUsageAnalysis

  if (scoredFulfilled.length === 1) {
    projectAnalysis = { ...scoredFulfilled[0].analysis, annotatedTurns: undefined }
  } else {
    const combinedEvents = remapped.flatMap((e) => e.remappedEvents)
    const projectModuleEval = averageModuleEvals(scoredFulfilled.map((s) => s.moduleEval))
    const combinedFeatures = extractFeatures(combinedEvents, [])
    const combinedScoring = computeScores(combinedFeatures, rubric)
    const combinedConfidence = calculateConfidence([], combinedFeatures, [])
    projectAnalysis = projectAggregateToAnalysis(
      projectModuleEval,
      combinedScoring,
      combinedConfidence.level as "High" | "Medium" | "Low",
      combinedEvents.length
    )
  }

  if (rejected.length > 0) {
    projectAnalysis.summary = `${projectAnalysis.summary} ${rejected.length} session${rejected.length === 1 ? "" : "s"} failed and were excluded.`
  }

  return {
    sessionAnalyses: scoredFulfilled.map((s) => ({
      sessionId: s.sessionId,
      fileName: s.fileName,
      sessionLabel: s.sessionLabel,
      chatLog: s.chatLog,
      supplementaryFiles: s.supplementaryFiles,
      analysis: s.analysis,
    })),
    projectAnalysis,
    failedSessions: rejected.map((entry) => String(entry.reason)),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function createOpenAIClient(): OpenAI | undefined {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return undefined
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Slait",
    },
  })
}

/**
 * Average module scores across multiple ModuleEvalResults.
 * Used to derive a project score from per-session evals without
 * running an additional combined LLM pass.
 */
function averageModuleEvals(evals: ModuleEvalResult[]): ModuleEvalResult {
  if (evals.length === 1) return evals[0]

  const allModuleIds = Object.keys(evals[0].module_scores)
  const averaged: ModuleEvalResult["module_scores"] = {}

  for (const moduleId of allModuleIds) {
    const scores = evals.map((e) => e.module_scores[moduleId]).filter(Boolean)
    if (scores.length === 0) continue

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length

    averaged[moduleId] = {
      module_id: moduleId,
      score: Math.round(avgScore * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      evidence: scores.flatMap((s) => s.evidence).slice(0, 5),
      explanation: scores.sort((a, b) => b.confidence - a.confidence)[0].explanation,
      fallback: scores.every((s) => s.fallback),
      relevant_turn_ids: scores.flatMap((s) => s.relevant_turn_ids ?? []),
    }
  }

  const weights = evals[0].weights
  let weightedTotal = 0
  for (const [moduleId, score] of Object.entries(averaged)) {
    weightedTotal += score.score * (weights[moduleId] ?? 0)
  }
  weightedTotal = Math.round(Math.max(0, Math.min(5, weightedTotal)) * 100) / 100

  return {
    module_scores: averaged,
    weights,
    weighted_total: weightedTotal,
    hire_signal: weightedTotal >= 4.0 ? "Strong Yes" : weightedTotal >= 3.0 ? "Yes" : "No",
    evaluator_version: evals[0].evaluator_version,
  }
}

function projectAggregateToAnalysis(
  moduleEval: ModuleEvalResult,
  scoring: ReturnType<typeof computeScores>,
  confidence: AIUsageAnalysis["confidence"],
  totalEvents: number
): AIUsageAnalysis {
  const dimensionScores = {
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

  const strengths: string[] = []
  const weaknesses: string[] = []
  for (const [id, score] of Object.entries(moduleEval.module_scores)) {
    if (score.score >= 4) strengths.push(`Strong ${id.replace(/_/g, " ")} (${score.score.toFixed(1)}/5)`)
    else if (score.score < 2) weaknesses.push(`Weak ${id.replace(/_/g, " ")} — ${score.explanation}`)
  }

  const exampleEvidence = Object.values(moduleEval.module_scores)
    .filter((score) => score.evidence.length > 0 && !score.fallback)
    .sort((a, b) => Math.abs(b.score - 2.5) - Math.abs(a.score - 2.5))
    .slice(0, 6)
    .map((score) => ({
      behavior: score.evidence[0] ?? score.explanation,
      why_it_matters: `${score.module_id.replace(/_/g, " ")} score: ${score.score}/5 — ${score.explanation}`,
    }))

  return {
    overallScore: moduleEval.weighted_total,
    confidence,
    dimensionScores,
    moduleEval,
    annotatedTurns: undefined,
    strengths,
    weaknesses,
    detectedPatterns: [],
    exampleEvidence,
    hireSignal:
      moduleEval.hire_signal === "Strong Yes"
        ? "Strong Yes"
        : moduleEval.hire_signal === "Yes"
          ? "Yes"
          : "No",
    summary: `Analyzed ${totalEvents} conversation events.`,
  }
}

function avg(values: (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => typeof v === "number")
  if (nums.length === 0) return undefined
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function removeInapplicableModules(moduleEval: ModuleEvalResult): ModuleEvalResult {
  const EXCLUDED_MODULES = new Set(["alignment"])

  const filteredModuleScores = Object.fromEntries(
    Object.entries(moduleEval.module_scores).filter(([moduleId]) => !EXCLUDED_MODULES.has(moduleId))
  )
  const filteredWeights = Object.fromEntries(
    Object.entries(moduleEval.weights).filter(([moduleId]) => !EXCLUDED_MODULES.has(moduleId))
  )

  const weightSum = Object.values(filteredWeights).reduce((a, b) => a + b, 0)
  const normalizedWeights = weightSum > 0
    ? Object.fromEntries(Object.entries(filteredWeights).map(([k, v]) => [k, v / weightSum]))
    : filteredWeights

  let weightedTotal = 0
  for (const [moduleId, score] of Object.entries(filteredModuleScores)) {
    weightedTotal += score.score * (normalizedWeights[moduleId] ?? 0)
  }
  weightedTotal = Math.round(Math.max(0, Math.min(5, weightedTotal)) * 100) / 100

  return {
    ...moduleEval,
    module_scores: filteredModuleScores,
    weights: normalizedWeights,
    weighted_total: weightedTotal,
    hire_signal: weightedTotal >= 4.0 ? "Strong Yes" : weightedTotal >= 3.0 ? "Yes" : "No",
  }
}