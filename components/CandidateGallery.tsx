'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import RadarChart from './RadarChart'

const labels = [
  'Architecture',
  'Code Quality',
  'Error Handling',
  'Testing',
  'Performance',
  'Security',
  'Planning',
  'Prompt Quality',
  'Debugging',
  'Tool Control',
  'Eng. Judgment'
]

const candidates = [
  {
    id: 1,
    name: 'Candidate A',
    score: 87,
    highlight: 'Architecture',
    data: [92, 85, 78, 70, 88, 82, 90, 95, 75, 80, 88],
    highlightIndex: 0
  },
  {
    id: 2,
    name: 'Candidate B',
    score: 72,
    highlight: 'Testing',
    data: [65, 70, 82, 95, 60, 75, 68, 72, 88, 70, 65],
    highlightIndex: 3
  },
  {
    id: 3,
    name: 'Candidate C',
    score: 91,
    highlight: 'Security',
    data: [88, 92, 90, 85, 95, 98, 87, 90, 92, 88, 94],
    highlightIndex: 5
  },
  {
    id: 4,
    name: 'Candidate D',
    score: 68,
    highlight: 'Debugging',
    data: [55, 60, 72, 65, 70, 68, 75, 62, 92, 85, 70],
    highlightIndex: 8
  }
]

export default function CandidateGallery() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  const goToNext = useCallback(() => {
    if (isAnimating) return
    setDirection('right')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % candidates.length)
      setIsAnimating(false)
    }, 300)
  }, [isAnimating])

  const goToPrev = useCallback(() => {
    if (isAnimating) return
    setDirection('left')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + candidates.length) % candidates.length)
      setIsAnimating(false)
    }, 300)
  }, [isAnimating])

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(goToNext, 5000)
    return () => clearInterval(interval)
  }, [goToNext])

  const candidate = candidates[currentIndex]

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col">
      {/* Gallery Container */}
      <div className="glass-card p-4 flex-1">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-lg" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Results</span>
          <div className="flex items-center gap-1">
            {candidates.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!isAnimating) {
                    setDirection(idx > currentIndex ? 'right' : 'left')
                    setIsAnimating(true)
                    setTimeout(() => {
                      setCurrentIndex(idx)
                      setIsAnimating(false)
                    }, 300)
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex 
                    ? 'bg-primary w-4' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Candidate Content */}
        <div 
          className={`transition-all duration-300 ${
            isAnimating 
              ? direction === 'right' 
                ? 'opacity-0 translate-x-4' 
                : 'opacity-0 -translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Score */}
          <div className="flex items-center justify-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">score:</span>
              <span className={`text-2xl font-bold ${
                candidate.score >= 85 ? 'text-primary' :
                candidate.score >= 70 ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {candidate.score}
              </span>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="flex justify-center py-1 overflow-visible">
            <RadarChart
              data={candidate.data}
              labels={labels}
              highlightIndex={candidate.highlightIndex}
              size={240}
            />
          </div>

          {/* Highlight Badge */}
          <div className="flex justify-center mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs text-amber-300">
                Standout: {candidate.highlight}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  )
}
