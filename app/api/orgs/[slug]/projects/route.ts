import { NextRequest, NextResponse } from "next/server"
import type { AIUsageAnalysis, SessionSource } from "@/lib/types"
import { adminDb, getMembershipBySlug, requireAuthUser } from "@/lib/org-api"

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
  source: SessionSource
  claudeMd?: string | null
  skillsFiles?: Record<string, string> | null
  projectAnalysis?: AIUsageAnalysis
  sessions?: SessionToPersist[]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await getMembershipBySlug(slug, auth.user.id)
  if (!membership) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const db = adminDb()
  const { data, error } = await db
    .from("projects")
    .select("id, name, description, source, overall_score, confidence, hire_signal, summary, strengths, weaknesses, detected_patterns, created_at, is_public")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await getMembershipBySlug(slug, auth.user.id)
  if (!membership) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  let body: CreateProjectBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { name, description, source, claudeMd, skillsFiles, projectAnalysis, sessions } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 })
  }
  if (!projectAnalysis || typeof projectAnalysis !== "object") {
    return NextResponse.json({ error: "projectAnalysis is required" }, { status: 400 })
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: "sessions are required" }, { status: 400 })
  }

  const db = adminDb()
  const { data: createdProject, error: projectError } = await db
    .from("projects")
    .insert({
      user_id: auth.user.id,
      organization_id: membership.organization_id,
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
      is_public: false,
    })
    .select("id")
    .single()

  if (projectError || !createdProject) {
    return NextResponse.json({ error: projectError?.message ?? "Failed to create project" }, { status: 500 })
  }

  const sessionRows = sessions.map((session) => ({
    user_id: auth.user.id,
    organization_id: membership.organization_id,
    source,
    file_name: session.fileName,
    overall_score: null,
    confidence: null,
    dimension_scores: null,
    dimension_evidence: null,
    module_eval: null,
    annotated_turns: session.analysis.annotatedTurns ?? null,
    strengths: [],
    weaknesses: [],
    detected_patterns: [],
    example_evidence: [],
    hire_signal: null,
    summary: session.analysis.summary || "Organization project session transcript for drilldown.",
    raw_log: session.rawLog,
    supplementary_files: session.supplementaryFiles ?? null,
    project_id: createdProject.id,
    session_label: session.sessionLabel ?? null,
    is_public: false,
  }))

  const { error: sessionError } = await db.from("sessions").insert(sessionRows)
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  return NextResponse.json({ id: createdProject.id })
}
