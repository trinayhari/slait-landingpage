import type { AIUsageAnalysis, SessionSource } from "@/lib/types"

export function analysisToSessionRow(
  analysis: AIUsageAnalysis,
  source: SessionSource,
  fileName: string | null,
  rawLog: string | null,
  supplementaryFiles?: Record<string, string> | null,
  projectId?: string | null,
  sessionLabel?: string | null
) {
  const dimensionScores = analysis.moduleEval
    ? Object.fromEntries(
        Object.entries(analysis.moduleEval.module_scores).map(([id, ms]) => [id, ms.score])
      )
    : analysis.dimensionScores

  const dimensionEvidence = analysis.moduleEval
    ? Object.fromEntries(
        Object.entries(analysis.moduleEval.module_scores).map(([id, ms]) => [
          id,
          {
            score: ms.score,
            explanation: ms.explanation,
            examples: ms.evidence.map((quote) => ({ excerpt: quote, analysis: ms.explanation })),
          },
        ])
      )
    : (analysis.dimensionEvidence ?? null)

  return {
    source,
    file_name: fileName,
    overall_score: analysis.overallScore,
    confidence: analysis.confidence,
    dimension_scores: dimensionScores,
    dimension_evidence: dimensionEvidence,
    module_eval: analysis.moduleEval ?? null,
    annotated_turns: analysis.annotatedTurns ?? null,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    detected_patterns: analysis.detectedPatterns,
    example_evidence: analysis.exampleEvidence,
    hire_signal: analysis.hireSignal,
    summary: analysis.summary,
    raw_log: rawLog,
    supplementary_files: supplementaryFiles ?? null,
    project_id: projectId ?? null,
    session_label: sessionLabel ?? null,
    is_public: true,
  }
}
