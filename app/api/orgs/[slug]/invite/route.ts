import { NextRequest, NextResponse } from "next/server"
import { adminDb, getMembershipBySlug, requireAuthUser } from "@/lib/org-api"
import { buildInviteToken } from "@/lib/orgs"

type InviteBody = {
  email?: string
  role?: "admin" | "member"
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
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  let body: InviteBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  const role: "admin" | "member" = body.role === "admin" ? "admin" : "member"
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
  }

  const db = adminDb()

  const { data: targetProfile } = await db
    .from("profiles")
    .select("id")
    .eq("id", auth.user.id)
    .maybeSingle()

  if (!targetProfile) {
    return NextResponse.json({ error: "Invalid inviter profile" }, { status: 400 })
  }

  const token = buildInviteToken()
  const { data, error } = await db
    .from("organization_invites")
    .insert({
      organization_id: membership.organization_id,
      email,
      role,
      invited_by: auth.user.id,
      token,
    })
    .select("id, email, role, token, expires_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create invite" }, { status: 500 })
  }

  return NextResponse.json(data)
}
