import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireAuthUser } from "@/lib/org-api"

type AcceptBody = {
  token?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: AcceptBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const token = body.token?.trim()
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }

  const db = adminDb()

  const { data: invite, error: inviteError } = await db
    .from("organization_invites")
    .select("id, organization_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 409 })
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 })
  }

  const { data: userData } = await auth.supabase.auth.getUser()
  const userEmail = userData.user?.email?.toLowerCase()
  if (!userEmail || userEmail !== String(invite.email).toLowerCase()) {
    return NextResponse.json({ error: "Invite email does not match signed-in user" }, { status: 403 })
  }

  const { data: activeMemberships, error: activeMembershipsError } = await db
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active")

  if (activeMembershipsError) {
    return NextResponse.json({ error: activeMembershipsError.message }, { status: 500 })
  }

  const hasMembershipInAnotherOrg = (activeMemberships ?? []).some(
    (membership) => membership.organization_id !== invite.organization_id
  )
  if (hasMembershipInAnotherOrg) {
    return NextResponse.json({ error: "You can only belong to one organization right now" }, { status: 409 })
  }

  const { error: upsertError } = await db
    .from("organization_memberships")
    .upsert(
      {
        organization_id: invite.organization_id,
        user_id: auth.user.id,
        role: invite.role,
        status: "active",
      },
      { onConflict: "organization_id,user_id" }
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const { error: acceptError } = await db
    .from("organization_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: auth.user.id,
    })
    .eq("id", invite.id)

  if (acceptError) {
    return NextResponse.json({ error: acceptError.message }, { status: 500 })
  }

  const { data: org } = await db
    .from("organizations")
    .select("slug")
    .eq("id", invite.organization_id)
    .single()

  return NextResponse.json({ ok: true, slug: org?.slug ?? null })
}
