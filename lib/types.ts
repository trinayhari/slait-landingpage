export interface DimensionEvidence {
  score: number
  explanation: string
  examples?: Array<{
    excerpt: string
    analysis: string
  }>
}

export interface AIUsageAnalysis {
  overallScore: number
  confidence: "High" | "Medium" | "Low"
  dimensionScores: {
    planning: number
    promptIteration: number
    debugging: number
    toolControl: number
    engineeringJudgment: number
  }
  dimensionEvidence?: {
    planning?: DimensionEvidence
    promptIteration?: DimensionEvidence
    debugging?: DimensionEvidence
    toolControl?: DimensionEvidence
    engineeringJudgment?: DimensionEvidence
  }
  strengths: string[]
  weaknesses: string[]
  detectedPatterns: string[]
  exampleEvidence: Array<{
    behavior: string
    why_it_matters: string
  }>
  hireSignal: "Strong Yes" | "Yes" | "Borderline" | "No"
  summary: string
}
