'use client'

import { useEffect, useRef } from 'react'

interface RadarChartProps {
  data: number[]
  labels: string[]
  highlightIndex?: number
  size?: number
  labelPadding?: number
  radiusScale?: number
}

const shortLabels: Record<string, string> = {
  'Architecture': 'Arch',
  'Code Quality': 'Quality',
  'Error Handling': 'Errors',
  'Testing': 'Testing',
  'Performance': 'Perf',
  'Security': 'Security',
  'Planning': 'Planning',
  'Prompt Quality': 'Prompts',
  'Debugging': 'Debug',
  'Tool Control': 'Tools',
  'Engineering Judgment': 'Judgment',
  'Constraints': 'Constraints',
  'Iteration': 'Iteration',
  'Correction': 'Correction',
  'Correction + Review': 'Correction',
  'Tool Usage': 'Tools',
  'Assessment Alignment': 'Alignment',
  'Repetition': 'Repetition',
  'Understanding': 'Understand',
  'Context Management': 'Context Mgmt',
  'Negative Prompting': 'Neg. Prompting',
  'Persona Assignment': 'Persona',
  'Chain-of-Thought': 'CoT',
}

export default function RadarChart({ 
  data, 
  labels, 
  highlightIndex,
  size = 320,
  labelPadding = 72,
  radiusScale = 0.28,
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up for high DPI displays
    const dpr = window.devicePixelRatio || 1

    const radius = size * radiusScale
    const numPoints = labels.length
    const angleStep = (Math.PI * 2) / numPoints
    const startAngle = -Math.PI / 2

    // Padding so labels (especially "Constraints", "Repetition") don't get cut off
    const canvasSize = size + 2 * labelPadding
    const drawCenterX = canvasSize / 2
    const drawCenterY = canvasSize / 2

    canvas.width = canvasSize * dpr
    canvas.height = canvasSize * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // Draw grid circles
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.arc(drawCenterX, drawCenterY, (radius * i) / 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Draw grid lines from center to each point
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
    for (let i = 0; i < numPoints; i++) {
      const angle = startAngle + i * angleStep
      const x = drawCenterX + Math.cos(angle) * radius
      const y = drawCenterY + Math.sin(angle) * radius
      ctx.beginPath()
      ctx.moveTo(drawCenterX, drawCenterY)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    // Draw data polygon
    ctx.beginPath()
    for (let i = 0; i < numPoints; i++) {
      const angle = startAngle + i * angleStep
      const value = data[i] / 100
      const x = drawCenterX + Math.cos(angle) * radius * value
      const y = drawCenterY + Math.sin(angle) * radius * value

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()

    // Fill with gradient
    const gradient = ctx.createRadialGradient(drawCenterX, drawCenterY, 0, drawCenterX, drawCenterY, radius)
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.1)')
    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke the polygon
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw highlight slice if specified
    if (highlightIndex !== undefined && highlightIndex >= 0) {
      const angle1 = startAngle + highlightIndex * angleStep
      const angle2 = startAngle + (highlightIndex + 1) * angleStep

      ctx.beginPath()
      ctx.moveTo(drawCenterX, drawCenterY)
      ctx.arc(drawCenterX, drawCenterY, radius * 0.85, angle1, angle2)
      ctx.closePath()
      
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(251, 191, 36, 1)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw labels
    ctx.fillStyle = 'rgba(232, 238, 245, 0.85)'
    ctx.font = '9px "Geist Mono", monospace'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < numPoints; i++) {
      const angle = startAngle + i * angleStep
      const labelRadius = radius + 20
      const x = drawCenterX + Math.cos(angle) * labelRadius
      const y = drawCenterY + Math.sin(angle) * labelRadius

      // Adjust text alignment based on position for better readability
      const cosAngle = Math.cos(angle)
      if (Math.abs(cosAngle) < 0.2) {
        ctx.textAlign = 'center'
      } else if (cosAngle > 0) {
        ctx.textAlign = 'left'
      } else {
        ctx.textAlign = 'right'
      }

      // Use short labels
      const displayLabel = shortLabels[labels[i]] || labels[i]
      ctx.fillText(displayLabel, x, y)
    }


  }, [data, labels, highlightIndex, size, labelPadding, radiusScale])

  const canvasSize = size + 2 * labelPadding

  return (
    <canvas
      ref={canvasRef}
      style={{ width: canvasSize, height: canvasSize, maxWidth: '100%', maxHeight: canvasSize }}
      className="block mx-auto"
    />
  )
}
