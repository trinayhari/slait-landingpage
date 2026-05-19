import { NextRequest, NextResponse } from "next/server"
import { analyzeProjectSessions } from "@/lib/projectAnalysis"
import { analysisToSessionRow } from "@/lib/sessionRow"
import { adminDb, getMembershipBySlug, requireAuthUser } from "@/lib/org-api"

type SessionToAppend = {
  fileName: string
  sessionLabel?: string | null
  rawLog: string
  supplementaryFiles?: Record<string, string> | null
}

type AppendSessionsBody = {
  sessions: SessionToAppend[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const membership = await getMembershipBySlug(slug, auth.user.id)
  if (!membership) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  let body: AppendSessionsBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.sessions) || body.sessions.length === 0) {
    return NextResponse.json({ error: "sessions are required" }, { status: 400 })
  }

  const validNewSessions = body.sessions.filter(
    (session) => typeof session.rawLog === "string" && session.rawLog.trim().length > 0
  )
  if (validNewSessions.length === 0) {
    return NextResponse.json({ error: "No valid sessions to append" }, { status: 400 })
  }

  const db = adminDb()
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id, user_id, organization_id, name, source, is_public, claude_md, skills_files")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { data: existingSessions, error: existingSessionsError } = await db
    .from("sessions")
    .select("id, file_name, session_label, raw_log, supplementary_files")
    .eq("project_id", id)
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: true })

  if (existingSessionsError) {
    return NextResponse.json({ error: existingSessionsError.message }, { status: 500 })
  }

  const existingForAnalysis = (existingSessions ?? [])
    .filter((session) => typeof session.raw_log === "string" && session.raw_log.trim().length > 0)
    .map((session) => ({
      sessionId: `existing:${session.id}`,
      fileName: session.file_name ?? "Session",
      sessionLabel: session.session_label,
      chatLog: session.raw_log as string,
      supplementaryFiles:
        session.supplementary_files && typeof session.supplementary_files === "object"
          ? (session.supplementary_files as Record<string, string>)
          : null,
    }))

  const newSessionKeys = new Set<string>()
  const newForAnalysis = validNewSessions.map((session, index) => {
    const sessionKey = `new:${index}`
    newSessionKeys.add(sessionKey)
    return {
      sessionId: sessionKey,
      fileName: session.fileName,
      sessionLabel: session.sessionLabel ?? null,
      chatLog: session.rawLog,
      supplementaryFiles: session.supplementaryFiles ?? null,
    }
  })

  let analyzed: Awaited<ReturnType<typeof analyzeProjectSessions>>
  try {
    analyzed = await analyzeProjectSessions({
      source: project.source,
      projectName: project.name,
      sessions: [...existingForAnalysis, ...newForAnalysis],
      claudeMd: project.claude_md ?? null,
      skillsFiles:
        project.skills_files && typeof project.skills_files === "object"
          ? (project.skills_files as Record<string, string>)
          : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze sessions" },
      { status: 422 }
    )
  }

  const newAnalyses = analyzed.sessionAnalyses.filter(
    (session) => session.sessionId && newSessionKeys.has(session.sessionId)
  )
  if (newAnalyses.length === 0) {
    return NextResponse.json(
      { error: "No new sessions could be analyzed", failedSessions: analyzed.failedSessions },
      { status: 422 }
    )
  }

  const newSessionRows = newAnalyses.map((session) => ({
    user_id: auth.user.id,
    organization_id: membership.organization_id,
    ...analysisToSessionRow(
      session.analysis,
      project.source,
      session.fileName,
      session.chatLog,
      session.supplementaryFiles ?? null,
      id,
      session.sessionLabel
    ),
    is_public: false,
  }))

  const { error: insertError } = await db.from("sessions").insert(newSessionRows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: projectUpdateError } = await db
    .from("projects")
    .update({
      overall_score: analyzed.projectAnalysis.overallScore,
      confidence: analyzed.projectAnalysis.confidence,
      hire_signal: analyzed.projectAnalysis.hireSignal,
      dimension_scores: analyzed.projectAnalysis.dimensionScores,
      module_eval: analyzed.projectAnalysis.moduleEval ?? null,
      summary: analyzed.projectAnalysis.summary,
      strengths: analyzed.projectAnalysis.strengths,
      weaknesses: analyzed.projectAnalysis.weaknesses,
      detected_patterns: analyzed.projectAnalysis.detectedPatterns,
    })
    .eq("id", id)
    .eq("organization_id", membership.organization_id)

  if (projectUpdateError) {
    return NextResponse.json({ error: projectUpdateError.message }, { status: 500 })
  }

  return NextResponse.json({
    id,
    insertedSessions: newAnalyses.length,
    failedSessions: analyzed.failedSessions,
  })
}
