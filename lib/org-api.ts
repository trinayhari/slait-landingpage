import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type OrganizationMembership } from "@/lib/orgs"

type RawMembership = {
  organization_id: string
  user_id: string
  role: "admin" | "member"
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

export async function requireAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" as const }
  return { supabase, user }
}

export async function getMembershipBySlug(slug: string, userId: string) {
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
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organizations.slug", slug)
    .maybeSingle()

  if (error || !data) return null
  return normalizeMembership(data as RawMembership)
}

export async function getMembershipByOrgId(organizationId: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, user_id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle()

  if (error || !data) return null
  return data as { organization_id: string; user_id: string; role: "admin" | "member"; status: "active" | "invited" }
}

export function adminDb() {
  return createAdminClient()
}
