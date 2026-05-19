import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getApiUser } from "@/lib/api-auth"
import type { AIUsageAnalysis, SessionSource } from "@/lib/types"

const VALID_SOURCES: SessionSource[] = [
  "cursor",
  "claude",
  "chatgpt",
  "copilot",
  "windsurf",
  "other",
]

type SessionToPersist = {
  fileName: string
  sessionLabel?: string | null
  rawLog: string
  supplementaryFiles?: Record<string, string> | null
  analysis: AIUsageAnalysis
}

type CreateProjectBody = {
  name: string
  description?: string | null
  isPublic?: boolean
  source: SessionSource
  mode?: "link"
  claudeMd?: string | null
  skillsFiles?: Record<string, string> | null
  projectAnalysis?: AIUsageAnalysis
  sessions?: SessionToPersist[]
}

export async function GET(request: NextRequest) {
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, source, overall_score, confidence, hire_signal, summary, strengths, weaknesses, detected_patterns, created_at, is_public")
    .eq("user_id", auth.user.id)
    .is("organization_id", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[projects] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getApiUser(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = auth.isApiKey ? createAdminClient() : await createClient()

  let body: CreateProjectBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const {
    name,
    description,
    isPublic,
    source,
    mode,
    claudeMd,
    skillsFiles,
    projectAnalysis,
    sessions,
  } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  }

  // CLI link mode: create empty project (no analysis or sessions required)
  if (mode === "link") {
    const { data: created, error: createError } = await supabase
      .from("projects")
      .insert({
        user_id: auth.user.id,
        organization_id: null,
        name: name.trim(),
        description: description?.trim() || null,
        source,
        is_public: typeof isPublic === "boolean" ? isPublic : true,
      })
      .select("id")
      .single()

    if (createError || !created) {
      console.error("[projects] POST link error:", createError)
      return NextResponse.json({ error: createError?.message ?? "Failed to create project" }, { status: 500 })
    }
    return NextResponse.json({ id: created.id })
  }

  // Full project creation with analysis and sessions
  if (!projectAnalysis || typeof projectAnalysis !== "object") {
    return NextResponse.json({ error: "projectAnalysis is required" }, { status: 400 })
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: "sessions are required" }, { status: 400 })
  }

  const { data: createdProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: auth.user.id,
      organization_id: null,
      name: name.trim(),
      description: description?.trim() || null,
      source,
      overall_score: projectAnalysis.overallScore,
      confidence: projectAnalysis.confidence,
      hire_signal: projectAnalysis.hireSignal,
      dimension_scores: projectAnalysis.dimensionScores,
      module_eval: projectAnalysis.moduleEval ?? null,
      summary: projectAnalysis.summary,
      strengths: projectAnalysis.strengths,
      weaknesses: projectAnalysis.weaknesses,
      detected_patterns: projectAnalysis.detectedPatterns,
      claude_md: claudeMd ?? null,
      skills_files: skillsFiles ?? null,
      is_public: typeof isPublic === "boolean" ? isPublic : true,
    })
    .select("id")
    .single()

  if (projectError || !createdProject) {
    console.error("[projects] POST create project error:", projectError)
    return NextResponse.json({ error: projectError?.message ?? "Failed to create project" }, { status: 500 })
  }

  const sessionRows = sessions.map((session) => ({
    organization_id: null,
    source,
    file_name: session.fileName,
    overall_score: session.analysis.overallScore,
    confidence: session.analysis.confidence,
    dimension_scores: session.analysis.dimensionScores,
    dimension_evidence: session.analysis.dimensionEvidence ?? null,
    module_eval: session.analysis.moduleEval ?? null,
    annotated_turns: session.analysis.annotatedTurns ?? null,
    strengths: session.analysis.strengths ?? [],
    weaknesses: session.analysis.weaknesses ?? [],
    detected_patterns: session.analysis.detectedPatterns ?? [],
    example_evidence: session.analysis.exampleEvidence ?? [],
    hire_signal: session.analysis.hireSignal,
    summary: session.analysis.summary,
    raw_log: session.rawLog,
    supplementary_files: session.supplementaryFiles ?? null,
    project_id: createdProject.id,
    session_label: session.sessionLabel ?? null,
    is_public: typeof isPublic === "boolean" ? isPublic : true,
  }))

  const { error: sessionError } = await supabase
    .from("sessions")
    .insert(sessionRows.map((row) => ({ user_id: auth.user.id, ...row })))

  if (sessionError) {
    console.error("[projects] POST session insert error:", sessionError)
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  return NextResponse.json({ id: createdProject.id })
}