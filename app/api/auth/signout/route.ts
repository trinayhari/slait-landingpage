import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: NextRequest) {
  // Response we will return (and attach cookie changes to)
  const res = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set(name, value, options)
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, maxAge: 0 })
        },
      },
    }
  )

  await supabase.auth.signOut()

  // Hard-clear remaining Supabase auth cookies by inferred names.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = url ? new URL(url).hostname.split(".")[0] : null
  const baseName = projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token"
  const candidateNames = new Set<string>([baseName, "sb-auth-token"])
  for (let i = 0; i < 6; i += 1) {
    candidateNames.add(`${baseName}.${i}`)
    candidateNames.add(`sb-auth-token.${i}`)
  }
  req.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
    .forEach((cookie) => candidateNames.add(cookie.name))

  candidateNames.forEach((name) => {
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
    })
  })

  return res
}
