'use client'

export default function Header() {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-4 fade-in-up">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <span className="text-5xl font-semibold text-primary tracking-tight">
          slait
        </span>
        <span className="ml-2 w-[8px] h-9 bg-primary animate-cursor-blink" />
      </div>

      {/* Terminal prompt indicator */}
      <div className="text-sm font-mono text-primary/70">
        $ slait analyze --session <span className="text-primary/50 animate-pulse">[awaiting file]</span>
      </div>

      {/* Tagline */}
      <p className="text-lg text-muted-foreground">
        How good of a vibecoder are you?
      </p>
    </div>
  )
}
