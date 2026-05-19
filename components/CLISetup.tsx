"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

export default function CLISetup() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copyApiKey = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/profile/api-key", { method: "GET" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Could not load API key")
        return
      }
      const key = data.api_key
      if (!key) {
        setError("No API key found")
        return
      }
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white/[0.03] backdrop-blur-[8px] p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">CLI setup</h3>
      <p className="text-xs text-muted-foreground">
        You need an API key to connect the CLI. Copy it below (it is not shown for security).
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={copyApiKey}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {loading ? "Copying…" : "Copy API key"}
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Then in your project directory run:
      </p>
      <pre className="rounded-md bg-card border border-border px-3 py-2 text-xs text-foreground overflow-x-auto">
        <code>npx slait.dev setup {'<your-api-key>'}</code>
      </pre>
      <p className="text-xs text-muted-foreground">
        After each Cursor or Claude session, run <code className="rounded bg-muted px-1">slait upload --cursor</code> or <code className="rounded bg-muted px-1">slait upload --claude</code> to sync that session.
      </p>
    </section>
  )
}
