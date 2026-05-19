// ── Module-based scoring types (9-module system) ───────────────────────────

export interface ModuleScore {
  module_id: string
  score: number          // 0–5
  evidence: string[]     // verbatim quotes from transcript
  explanation: string    // 1–2 sentence justification
  confidence: number     // 0–1
  fallback: boolean      // true if rule-based fallback (no LLM)
  relevant_turn_ids?: number[] // optional explicit turn mapping for evidence jumps
}

export interface ModuleEvalResult {
  module_scores: Record<string, ModuleScore>
  weights: Record<string, number>
  weighted_total: number   // 0–5
  hire_signal: "Strong Yes" | "Yes" | "No"
  evaluator_version: string
}

export interface AnnotatedSpan {
  module_id: string
  start: number
  end: number
  label: string
}

export interface AnnotatedTurn {
  turn_id: number
  user_text: string
  assistant_text: string
  spans: AnnotatedSpan[]
  session_index?: number
}

// ── Legacy 5-dimension evidence ───────────────────────────────────────────

export interface DimensionEvidence {
  score: number
  explanation: string
  examples?: Array<{
    excerpt: string
    analysis: string
    location?: string
  }>
}

// ── Main analysis result (supports both 5-dim legacy and 9-module new) ─────

export interface AIUsageAnalysis {
  overallScore: number
  confidence: "High" | "Medium" | "Low"

  // Legacy 5-dimension scores (kept for old sessions, also filled for new ones)
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

  // New 9-module scoring (present on sessions analysed with the full pipeline)
  moduleEval?: ModuleEvalResult
  annotatedTurns?: AnnotatedTurn[]

  // Raw transcript messages classified for display. Populated when the input is
  // Claude Code JSONL; lets the UI distinguish what the human typed from what
  // the Claude Code harness injected (tool results, sub-agent prompts, etc.).
  // Not persisted — derived at read time from `raw_log`.
  displayMessages?: import("./claudeCodeJsonl").DisplayMessage[]

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

// ── Session source ────────────────────────────────────────────────────────

export type SessionSource =
  | "cursor"
  | "claude"
  | "chatgpt"
  | "copilot"
  | "windsurf"
  | "other"

// ── Profile ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// ── Session (stored in Supabase) ──────────────────────────────────────────

export interface Session {
  id: string
  user_id: string
  organization_id: string | null
  project_id: string | null
  session_label: string | null
  source: SessionSource
  file_name: string | null
  overall_score: number
  confidence: string
  // dimension_scores is JSONB — may be legacy 5-dim or new 9-module keyed by module_id
  dimension_scores: AIUsageAnalysis["dimensionScores"] | Record<string, number>
  dimension_evidence: AIUsageAnalysis["dimensionEvidence"] | Record<string, { score: number; explanation: string; examples: Array<{ excerpt: string; analysis: string }> }> | null
  module_eval: ModuleEvalResult | null
  annotated_turns: AnnotatedTurn[] | null
  strengths: string[]
  weaknesses: string[]
  detected_patterns: string[]
  example_evidence: AIUsageAnalysis["exampleEvidence"]
  hire_signal: AIUsageAnalysis["hireSignal"]
  summary: string
  raw_log: string | null
  is_public: boolean
  created_at: string
}

export interface ProjectSessionSummary {
  id: string
  file_name: string | null
  session_label: string | null
  source: SessionSource
  overall_score: number
  confidence: string
  hire_signal: AIUsageAnalysis["hireSignal"]
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  organization_id: string | null
  name: string
  description: string | null
  source: SessionSource
  sources_used?: SessionSource[]
  overall_score: number | null
  confidence: AIUsageAnalysis["confidence"] | null
  hire_signal: AIUsageAnalysis["hireSignal"] | null
  dimension_scores: AIUsageAnalysis["dimensionScores"] | Record<string, number> | null
  module_eval: ModuleEvalResult | null
  summary: string | null
  strengths: string[]
  weaknesses: string[]
  detected_patterns: string[]
  claude_md: string | null
  skills_files: Record<string, string> | null
  is_public: boolean
  created_at: string
}

export interface ProjectWithSessions extends Project {
  sessions: ProjectSessionSummary[]
}

// ── Leaderboard ───────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
  best_score: number
  avg_score: number
  session_count: number
  project_count: number
  percentile_rank: number
  percentile_display: number
  rank: number
}

export interface Organization {
  id: string
  slug: string
  name: string
  created_by: string
  created_at?: string
}

export interface OrganizationMembership {
  organization_id: string
  user_id: string
  role: "admin" | "member"
  status: "active" | "invited"
  organization: Organization
}
