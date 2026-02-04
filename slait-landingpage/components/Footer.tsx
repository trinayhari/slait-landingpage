'use client'

export default function Footer() {
  return (
    <footer className="w-full mt-16 pt-8 border-t border-border/30 text-center text-xs text-muted-foreground font-mono">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span>© 2024 Slait</span>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">Docs</a>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">GitHub</a>
        <span className="text-primary/30">|</span>
        <a href="#" className="hover:text-primary transition-colors">Status</a>
      </div>
      <p className="mt-4 text-primary/50">
        Powered by advanced AI analysis engine
      </p>
    </footer>
  )
}
