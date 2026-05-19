'use client'

import Link from "next/link"

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "The Slate", href: "/slate" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Scoring Model", href: "/#scoring" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Home", href: "/" },
      { label: "GitHub", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-20 pt-10 border-t border-border/30">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
        <div className="col-span-2 sm:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            <span className="text-sm font-semibold text-foreground tracking-tight">Slait</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Become AI-native. With proof. Score how you ship with Claude Code, Cursor, Warp,
            and Windsurf.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
              {col.title}
            </p>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-6 border-t border-border/20 text-xs text-muted-foreground">
        <span>© 2026 Slait. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  )
}
