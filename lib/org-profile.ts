import { createClient } from "@/lib/supabase/server"

export async function getOrgProfileBySlug(slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, status, organizations!inner(id, slug, name, created_by)")
    .eq("status", "active")
    .eq("user_id", user.id)
    .eq("organizations.slug", slug)
    .maybeSingle()

  if (!membership) return null

  const orgRaw = (
    membership as {
      organizations:
        | { id: string; slug: string; name: string; created_by: string }
        | Array<{ id: string; slug: string; name: string; created_by: string }>
    }
  ).organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  const role = (membership as { role: "admin" | "member" }).role

  const [{ data: projectsRaw }, { data: members }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, source, overall_score, created_at, is_public")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("status", "active"),
  ])

  let leaderboard: unknown[] = []
  if (role === "admin") {
    const { data } = await supabase.rpc("get_org_leaderboard", { p_org_slug: slug })
    leaderboard = data ?? []
  }

  return {
    organization: org,
    role,
    projects: projectsRaw ?? [],
    memberCount: members?.length ?? 0,
    leaderboard,
  }
}

export async function getOrgWorkspaceBySlug(slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, status, organizations!inner(id, slug, name, created_by)")
    .eq("status", "active")
    .eq("user_id", user.id)
    .eq("organizations.slug", slug)
    .maybeSingle()

  if (!membership) return null

  const orgRaw = (
    membership as {
      organizations:
        | { id: string; slug: string; name: string; created_by: string }
        | Array<{ id: string; slug: string; name: string; created_by: string }>
    }
  ).organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  const role = (membership as { role: "admin" | "member" }).role

  const [{ data: profile }, { data: projectsRaw }, { data: orgLeaderboard }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("projects")
      .select("id, name, source, overall_score, created_at, is_public")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_org_leaderboard", { p_org_slug: slug }),
  ])

  if (!profile) return null

  const leaderboard =
    (orgLeaderboard ?? []).find((entry: { id: string }) => entry.id === user.id) ?? null

  return {
    organization: org,
    role,
    profile,
    projects: projectsRaw ?? [],
    leaderboard,
    isOwner: true,
  }
}

export async function getOrgMemberProfileBySlugAndHandle(slug: string, handle: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: viewerMembership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role, status, organizations!inner(id, slug, name, created_by)")
    .eq("status", "active")
    .eq("user_id", user.id)
    .eq("organizations.slug", slug)
    .maybeSingle()

  if (!viewerMembership) return null

  const orgRaw = (
    viewerMembership as {
      organizations:
        | { id: string; slug: string; name: string; created_by: string }
        | Array<{ id: string; slug: string; name: string; created_by: string }>
    }
  ).organizations
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  const role = (viewerMembership as { role: "admin" | "member" }).role

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .eq("handle", handle)
    .single()

  if (!profile) return null

  const [{ data: projectsRaw }, { data: orgLeaderboard }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, source, overall_score, created_at, is_public")
      .eq("organization_id", org.id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_org_leaderboard", { p_org_slug: slug }),
  ])

  const leaderboard =
    (orgLeaderboard ?? []).find((entry: { id: string }) => entry.id === profile.id) ?? null

  return {
    organization: org,
    role,
    profile,
    projects: projectsRaw ?? [],
    leaderboard,
    isOwner: user.id === profile.id,
  }
}
