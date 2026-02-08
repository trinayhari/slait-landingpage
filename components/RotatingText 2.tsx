'use client'

import { useState, useEffect } from 'react'

const verbs = ['think', 'architect', 'iterate', 'build', 'debug', 'ship']

export default function RotatingText() {
  const [verbIndex, setVerbIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentVerb = verbs[verbIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentVerb.length) {
          setDisplayText(currentVerb.slice(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setVerbIndex((prev) => (prev + 1) % verbs.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, verbIndex])

  return (
    <div className="text-center mb-2 space-y-1">
      <p className="text-3xl font-bold text-foreground">
        Hiring tools miss the real signal.
      </p>
      <p className="text-xl text-foreground">
        Slait reveals how candidates actually{' '}
        <span className="text-primary scan-glow">{displayText}</span>
        <span className="inline-block w-[2px] h-5 bg-primary ml-0.5 align-middle animate-cursor-blink" />
        {' '}with AI.
      </p>
    </div>
  )
}
