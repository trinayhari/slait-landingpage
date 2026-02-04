'use client'

export default function Header() {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-4 fade-in-up">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <img 
          src="/images/slait.jpg" 
          alt="Slait"
          className="h-16 w-auto"
        />
      </div>

      {/* Terminal prompt indicator */}
      <div className="text-sm font-mono text-primary/70">
        $ slait analyze --session <span className="text-primary/50 animate-pulse">[awaiting file]</span>
      </div>
    </div>
  )
}
