import { NextRequest, NextResponse } from "next/server"
import { adminDb, requireAuthUser } from "@/lib/org-api"
import { getMyOrganizations, normalizeOrgSlug } from "@/lib/orgs"

type CreateOrgBody = {
  name?: string
  slug?: string
}

export async function GET() {
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const memberships = await getMyOrganizations(auth.user.id)
    return NextResponse.json({ memberships })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load organizations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthUser()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  let body: CreateOrgBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = body.name?.trim()
  const slug = normalizeOrgSlug(body.slug?.trim() || body.name?.trim() || "")

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 })
  }

  const db = adminDb()
  const { data: activeMemberships, error: activeMembershipsError } = await db
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .limit(1)

  if (activeMembershipsError) {
    return NextResponse.json({ error: activeMembershipsError.message }, { status: 500 })
  }

  if ((activeMemberships ?? []).length > 0) {
    return NextResponse.json({ error: "You can only belong to one organization right now" }, { status: 409 })
  }

  const { data: existing } = await db
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "Slug is already in use" }, { status: 409 })
  }

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({
      name,
      slug,
      created_by: auth.user.id,
    })
    .select("id, name, slug")
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Failed to create organization" }, { status: 500 })
  }

  const { error: memberError } = await db
    .from("organization_memberships")
    .upsert(
      {
        organization_id: org.id,
        user_id: auth.user.id,
        role: "admin",
        status: "active",
      },
      { onConflict: "organization_id,user_id" }
    )

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json(org)
}
