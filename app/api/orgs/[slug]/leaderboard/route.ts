import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMembershipBySlug, requireAuthUser } from "@/lib/org-api"

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
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_org_leaderboard", {
    p_org_slug: slug,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data ?? [] })
}
