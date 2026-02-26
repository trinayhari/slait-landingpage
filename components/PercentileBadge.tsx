export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface PercentileBadgeProps {
  percentile: number
  className?: string
}

export default function PercentileBadge({ percentile, className = "" }: PercentileBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary ${className}`}
    >
      {getOrdinal(percentile)} percentile AI-native engineer
    </span>
  )
}
