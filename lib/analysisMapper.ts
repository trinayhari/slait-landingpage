import type { AIUsageAnalysis, AnnotatedTurn } from "@/lib/types"
import { parseClaudeCodeTranscript } from "@/lib/claudeCodeJsonl"

/**
 * Parse raw_log (JSON array of {role, content} messages from the CLI)
 * into basic AnnotatedTurn[] for live transcript display.
 */
function rawLogToTurns(rawLog: string): AnnotatedTurn[] | undefined {
  try {
    const messages = JSON.parse(rawLog) as Array<{ role: string; content: string }>
    if (!Array.isArray(messages) || messages.length === 0) return undefined

    const turns: AnnotatedTurn[] = []
    let currentUserText = ""
    let turnId = 1

    for (const msg of messages) {
      if (msg.role === "user") {
        if (currentUserText) {
          turns.push({ turn_id: turnId++, user_text: currentUserText, assistant_text: "", spans: [] })
        }
        currentUserText = msg.content
      } else if (msg.role === "assistant") {
        turns.push({ turn_id: turnId++, user_text: currentUserText, assistant_text: msg.content, spans: [] })
        currentUserText = ""
      }
    }

    if (currentUserText) {
      turns.push({ turn_id: turnId++, user_text: currentUserText, assistant_text: "", spans: [] })
    }

    return turns.length > 0 ? turns : undefined
  } catch {
    return undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToAnalysis(s: Record<string, any>): AIUsageAnalysis {
  const fallbackDimensionScores: AIUsageAnalysis["dimensionScores"] = {
    planning: 0,
    promptIteration: 0,
    debugging: 0,
    toolControl: 0,
    engineeringJudgment: 0,
  }

  const parsedClaude = typeof s.raw_log === "string" ? parseClaudeCodeTranscript(s.raw_log) : null

  return {
    overallScore: s.overall_score == null ? 0 : Number(s.overall_score),
    confidence: (s.confidence as "High" | "Medium" | "Low") ?? "Low",
    dimensionScores: (s.dimension_scores as AIUsageAnalysis["dimensionScores"] | null) ?? fallbackDimensionScores,
    dimensionEvidence: s.dimension_evidence ?? undefined,
    moduleEval: s.module_eval ?? undefined,
    annotatedTurns: s.annotated_turns ?? (s.raw_log ? rawLogToTurns(s.raw_log) : undefined),
    displayMessages: parsedClaude?.messages,
    strengths: Array.isArray(s.strengths) ? s.strengths : [],
    weaknesses: Array.isArray(s.weaknesses) ? s.weaknesses : [],
    detectedPatterns: Array.isArray(s.detected_patterns) ? s.detected_patterns : [],
    exampleEvidence: Array.isArray(s.example_evidence) ? s.example_evidence : [],
    hireSignal: (s.hire_signal as AIUsageAnalysis["hireSignal"]) ?? "No",
    summary: s.summary ?? "",
  }
}
