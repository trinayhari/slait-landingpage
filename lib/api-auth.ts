import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type AuthResult =
  | { user: { id: string }; isApiKey: boolean }
  | { error: string }

/**
 * Authenticate a request via either Supabase session cookie or Bearer API key.
 * API key auth uses the admin client to look up the profile by api_key,
 * bypassing RLS. Returns the user id in both cases.
 */
export async function getApiUser(request: NextRequest): Promise<AuthResult> {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim()
    if (!apiKey) return { error: "Empty API key" }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("api_key", apiKey)
      .single()

    if (error || !data) {
      return { error: "Invalid API key. Get or regenerate your key at the dashboard (same URL as the CLI base URL)." }
    }

    return { user: { id: data.id }, isApiKey: true }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized. Use Authorization: Bearer <api-key> or sign in in the browser." }
  }

  return { user: { id: user.id }, isApiKey: false }
}
