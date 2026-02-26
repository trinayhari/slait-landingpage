export interface DimensionEvidence {
  score: number
  explanation: string
  examples?: Array<{
    excerpt: string
    analysis: string
    location?: string
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

export type SessionSource =
  | "cursor"
  | "claude"
  | "chatgpt"
  | "copilot"
  | "windsurf"
  | "other"

export interface Profile {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  source: SessionSource
  file_name: string | null
  overall_score: number
  confidence: string
  dimension_scores: AIUsageAnalysis["dimensionScores"]
  dimension_evidence: AIUsageAnalysis["dimensionEvidence"]
  strengths: string[]
  weaknesses: string[]
  detected_patterns: string[]
  example_evidence: AIUsageAnalysis["exampleEvidence"]
  hire_signal: AIUsageAnalysis["hireSignal"]
  summary: string
  is_public: boolean
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  best_score: number
  session_count: number
  percentile_rank: number
  percentile_display: number
  rank: number
}
