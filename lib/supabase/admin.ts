import { createClient } from "@supabase/supabase-js"

/**
 * Server-side Supabase client with service role. Use only in API routes.
 * Bypasses RLS — use for admin operations like storing team interest signups.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, serviceRoleKey)
}
