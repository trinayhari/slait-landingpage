'use client'

interface HeaderProps {
  fileName?: string | null
}

export default function Header({ fileName }: HeaderProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-4 fade-in-up">
      {/* Logo */}
      <div className="flex items-center justify-center">
        <img
          src="/images/Slait.png"
          alt="Slait"
          className="h-10 w-auto"
        />
        <span className="ml-2 w-[8px] h-10.25 bg-primary animate-cursor-blink" />
      </div>

      {/* Terminal prompt indicator */}
      <div className="text-sm font-mono text-muted-foreground">
        <span className="text-primary">$</span> slait analyze --session <span className={`text-primary ${!fileName ? 'animate-pulse' : ''}`}>{fileName || '[file]'}</span>
      </div>
    </div>
  )
}
