'use client'

export default function Header() {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-4 fade-in-up">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <span className="text-5xl font-semibold text-primary tracking-tight">
          Slait
        </span>
        <span className="ml-2 w-[6px] h-11 bg-primary animate-cursor-blink" />
      </div>

      {/* Terminal prompt indicator */}
      <div className="text-sm font-mono text-primary/70">
        $ slait analyze --session <span className="text-primary/50 animate-pulse">[awaiting file]</span>
      </div>
    </div>
  )
}
