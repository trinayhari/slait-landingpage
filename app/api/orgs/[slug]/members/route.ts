import { NextRequest, NextResponse } from "next/server"
import { adminDb, getMembershipByOrgId, getMembershipBySlug, requireAuthUser } from "@/lib/org-api"

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
    .from("organization_memberships")
    .select(`
      organization_id,
      user_id,
      role,
      status,
      created_at,
      profile:profiles!inner(id, handle, display_name, avatar_url)
    `)
    .eq("organization_id", membership.organization_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data ?? [], viewer_role: membership.role })
}

export async function PATCH(
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
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  let body: { userId?: string; role?: "admin" | "member" }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.userId || (body.role !== "admin" && body.role !== "member")) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 })
  }

  const db = adminDb()
  if (body.role === "member") {
    const { count } = await db
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("role", "admin")
      .eq("status", "active")
    const target = await getMembershipByOrgId(membership.organization_id, body.userId)
    if (target?.role === "admin" && (count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 })
    }
  }

  const { error } = await db
    .from("organization_memberships")
    .update({ role: body.role })
    .eq("organization_id", membership.organization_id)
    .eq("user_id", body.userId)
    .eq("status", "active")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
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
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  let body: { userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const db = adminDb()
  const target = await getMembershipByOrgId(membership.organization_id, body.userId)
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  if (target.role === "admin") {
    const { count } = await db
      .from("organization_memberships")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("role", "admin")
      .eq("status", "active")
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
    }
  }

  const { error } = await db
    .from("organization_memberships")
    .delete()
    .eq("organization_id", membership.organization_id)
    .eq("user_id", body.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
