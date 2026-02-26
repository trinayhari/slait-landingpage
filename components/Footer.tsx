'use client'

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full mt-16 pt-8 border-t border-border/30 text-center text-xs text-muted-foreground">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span>© 2026 Slait</span>
        <span className="text-primary/30">|</span>
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span className="text-primary/30">|</span>
        <Link href="/leaderboard" className="hover:text-primary transition-colors">Leaderboard</Link>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">Docs</a>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">GitHub</a>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">Status</a>
      </div>
    </footer>
  )
}
