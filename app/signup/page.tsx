"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/?signup=true")
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <p className="text-muted-foreground">Redirecting…</p>
    </main>
  )
}
