import { createClient } from "@/lib/supabase/server"
import { buildInviteToken, normalizeOrgSlug } from "@/lib/org-utils"
export { buildInviteToken, normalizeOrgSlug }

export type OrganizationRole = "admin" | "member"

export type OrganizationMembership = {
  organization_id: string
  user_id: string
  role: OrganizationRole
  status: "active" | "invited"
  organization: {
    id: string
    slug: string
    name: string
    created_by: string
  }
}

type RawMembership = {
  organization_id: string
  user_id: string
  role: OrganizationRole
  status: "active" | "invited"
  organization:
    | {
        id: string
        slug: string
        name: string
        created_by: string
      }
    | Array<{
        id: string
        slug: string
        name: string
        created_by: string
      }>
}

function normalizeMembership(raw: RawMembership): OrganizationMembership {
  const organization = Array.isArray(raw.organization) ? raw.organization[0] : raw.organization
  return {
    organization_id: raw.organization_id,
    user_id: raw.user_id,
    role: raw.role,
    status: raw.status,
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      created_by: organization.created_by,
    },
  }
}

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function getOrgMembershipForUser(slug: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(`
      organization_id,
      user_id,
      role,
      status,
      organization:organizations!inner(id, slug, name, created_by)
    `)
    .eq("status", "active")
    .eq("user_id", userId)
    .eq("organizations.slug", slug)
    .maybeSingle()

  if (error || !data) return null

  return normalizeMembership(data as RawMembership)
}

export async function getMyOrganizations(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(`
      organization_id,
      user_id,
      role,
      status,
      organization:organizations!inner(id, slug, name, created_by)
    `)
    .eq("status", "active")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => normalizeMembership(row as RawMembership))
}
