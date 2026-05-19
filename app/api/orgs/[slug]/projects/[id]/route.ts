import { NextRequest, NextResponse } from "next/server"
import { adminDb, getMembershipBySlug, requireAuthUser } from "@/lib/org-api"

export async function GET(
  _request: NextRequest,
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

  const db = adminDb()
  const { data: project, error: projectError } = await db
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single()

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Project not found" },
      { status: projectError?.code === "PGRST116" ? 404 : 500 }
    )
  }

  const { data: sessions, error: sessionsError } = await db
    .from("sessions")
    .select("id, file_name, session_label, source, overall_score, confidence, hire_signal, created_at, status, turn_count")
    .eq("project_id", id)
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  const sessionList = sessions ?? []
  const sourcesUsed = [...new Set(sessionList.map((s: { source: string }) => s.source))]
  if (sourcesUsed.length === 0 && project.source) {
    sourcesUsed.push(project.source)
  }

  return NextResponse.json({
    ...project,
    sessions: sessionList,
    sources_used: sourcesUsed,
    is_owner: project.user_id === auth.user.id || membership.role === "admin",
  })
}

export async function PATCH(
  _request: NextRequest,
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

  const db = adminDb()
  const { data, error } = await db
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
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

  const db = adminDb()
  const { data: project, error: fetchError } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const canDelete = membership.role === "admin" || project.user_id === auth.user.id
  if (!canDelete) {
    return NextResponse.json({ error: "Only admins or the project owner can delete this project" }, { status: 403 })
  }

  const { error: deleteError } = await db
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("organization_id", membership.organization_id)

  if (deleteError) {
    console.error("[org projects] DELETE error:", deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
