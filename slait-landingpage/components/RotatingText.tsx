'use client'

import { useState, useEffect } from 'react'

const tools = ['Cursor', 'Codex', 'Claude Code']

export default function RotatingText() {
  const [toolIndex, setToolIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentTool = tools[toolIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentTool.length) {
          setDisplayText(currentTool.slice(0, displayText.length + 1))
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setToolIndex((prev) => (prev + 1) % tools.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, toolIndex])

  return (
    <div className="text-center mb-6">
      <p className="text-xl font-mono text-foreground">
        Analyze vibecoding chats with{' '}
        <span className="text-primary scan-glow">{displayText}</span>
        <span className="inline-block w-[2px] h-5 bg-primary ml-0.5 align-middle animate-cursor-blink" />
      </p>
    </div>
  )
}
