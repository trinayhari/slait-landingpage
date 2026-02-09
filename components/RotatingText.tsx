'use client'

import { useState, useEffect } from 'react'

const verbs = ['think', 'architect', 'iterate', 'build', 'debug', 'ship']

export default function RotatingText() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [animState, setAnimState] = useState<'idle' | 'exit' | 'enter'>('idle')
  const [widths, setWidths] = useState<number[]>([])

  // Measure all word widths after fonts are loaded
  useEffect(() => {
    const measure = () => {
      const el = document.createElement('span')
      el.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:1.25rem;font-weight:700'
      el.style.fontFamily = getComputedStyle(document.body).fontFamily
      document.body.appendChild(el)

      const measured = verbs.map(v => {
        el.textContent = v
        return el.offsetWidth
      })

      document.body.removeChild(el)
      setWidths(measured)
    }

    document.fonts.ready.then(measure)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimState('exit')
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % verbs.length)
        setAnimState('enter')
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimState('idle')
          })
        })
      }, 300)
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-center mb-2 space-y-1">
      <p className="text-3xl font-bold text-foreground">
        Hiring tools miss the real signal.
      </p>
      <p className="text-xl text-foreground">
        Slait reveals how candidates actually{' '}
        <span
          className="inline-flex overflow-hidden transition-[width] duration-300 ease-in-out"
          style={{ width: widths.length > 0 ? widths[currentIndex] : undefined }}
        >
          <span
            className="text-primary font-bold whitespace-nowrap"
            style={{
              transform: animState === 'exit' ? 'translateY(100%)' : animState === 'enter' ? 'translateY(-100%)' : 'translateY(0)',
              opacity: animState === 'idle' ? 1 : 0,
              transition: animState === 'enter' ? 'none' : 'all 300ms ease-in-out',
            }}
          >
            {verbs[currentIndex]}
          </span>
        </span>{' '}
        with AI.
      </p>
    </div>
  )
}
