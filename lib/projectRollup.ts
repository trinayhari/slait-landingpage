import type { SupabaseClient } from "@supabase/supabase-js"
import { analyzeProjectSessions } from "@/lib/projectAnalysis"

type DbClient = SupabaseClient

type SessionForAnalysis = {
  id: string
  file_name: string | null
  session_label: string | null
  source: string | null
  raw_log: string | null
  supplementary_files: unknown
}

type ProjectForRollup = {
  id: string
  name: string
  source: string
  claude_md: string | null
  skills_files: unknown
}

export async function recomputeProjectRollupForUserProject(
  db: DbClient,
  projectId: string,
  userId: string
): Promise<void> {
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id, name, source, claude_md, skills_files")
    .eq("id", projectId)
    .eq("user_id", userId)
    .is("organization_id", null)
    .single<ProjectForRollup>()

  if (projectError || !project) {
    console.error("[project-rollup] Could not load project:", projectError?.message ?? "Not found")
    return
  }

  const { data: sessions, error: sessionsError } = await db
    .from("sessions")
    .select("id, file_name, session_label, source, raw_log, supplementary_files")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .is("organization_id", null)
    .eq("status", "complete")
    .order("created_at", { ascending: true })
    .returns<SessionForAnalysis[]>()

  if (sessionsError) {
    console.error("[project-rollup] Could not load sessions:", sessionsError.message)
    return
  }

  const sessionsForAnalysis = (sessions ?? [])
    .filter((session) => typeof session.raw_log === "string" && session.raw_log.trim().length > 0)
    .map((session) => ({
      sessionId: session.id,
      fileName: session.file_name ?? "Session",
      sessionLabel: session.session_label,
      chatLog: session.raw_log as string,
      source: (session.source ?? project.source) as "cursor" | "claude" | "chatgpt" | "copilot" | "windsurf" | "other",
      supplementaryFiles:
        session.supplementary_files && typeof session.supplementary_files === "object"
          ? (session.supplementary_files as Record<string, string>)
          : null,
    }))

  if (sessionsForAnalysis.length === 0) {
    return
  }

  try {
    const analyzed = await analyzeProjectSessions({
      source: project.source as "cursor" | "claude" | "chatgpt" | "copilot" | "windsurf" | "other",
      projectName: project.name,
      sessions: sessionsForAnalysis,
      claudeMd: project.claude_md,
      skillsFiles:
        project.skills_files && typeof project.skills_files === "object"
          ? (project.skills_files as Record<string, string>)
          : null,
    })

    const { error: updateError } = await db
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
      .eq("id", projectId)
      .eq("user_id", userId)
      .is("organization_id", null)

    if (updateError) {
      console.error("[project-rollup] Could not update project:", updateError.message)
    }
  } catch (error) {
    console.error("[project-rollup] Recompute failed:", error)
  }
}
