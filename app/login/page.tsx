"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
  const redirect = searchParams.get("redirect") ?? "/"
    const error = searchParams.get("error")
    const params = new URLSearchParams()
    params.set("login", "true")
  if (redirect !== "/") params.set("redirect", redirect)
    if (error === "auth") params.set("error", "auth")
    router.replace(`/?${params.toString()}`)
  }, [router, searchParams])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <p className="text-muted-foreground">Redirecting…</p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginRedirect />
    </Suspense>
  )
}
