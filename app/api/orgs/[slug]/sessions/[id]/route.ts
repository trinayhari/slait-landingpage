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
  const { data, error } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Session not found" },
      { status: error?.code === "PGRST116" ? 404 : 500 }
    )
  }

  return NextResponse.json(data)
}
