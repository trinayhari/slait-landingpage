'use client'

import { useEffect, useRef } from 'react'

const NUM_POINTS = 9
const LERP = 0.018
const TARGET_INTERVAL_MS = 3200

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function randomValue() {
  return 0.25 + Math.random() * 0.7 // 25%–95% so the wheel keeps a visible shape
}

export default function AttributeWheelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const valuesRef = useRef<number[]>(Array.from({ length: NUM_POINTS }, () => randomValue()))
  const targetsRef = useRef<number[]>(Array.from({ length: NUM_POINTS }, () => randomValue()))
  const lastTargetTimeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let rafId: number

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w / 2
      const cy = h / 2
      const radius = Math.min(w, h) * 0.52

      const angleStep = (Math.PI * 2) / NUM_POINTS
      const startAngle = -Math.PI / 2

      // Update targets periodically
      const now = Date.now()
      if (now - lastTargetTimeRef.current > TARGET_INTERVAL_MS) {
        lastTargetTimeRef.current = now
        targetsRef.current = Array.from({ length: NUM_POINTS }, () => randomValue())
      }

      // Smooth lerp current values toward targets
      const current = valuesRef.current
      const targets = targetsRef.current
      for (let i = 0; i < NUM_POINTS; i++) {
        current[i] = lerp(current[i], targets[i], LERP)
      }

      ctx.clearRect(0, 0, w, h)

      // Grid circles
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)'
      ctx.lineWidth = 1
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (radius * i) / 5, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Radial lines
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.06)'
      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = startAngle + i * angleStep
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(x, y)
        ctx.stroke()
      }

      // Data polygon (filled + stroke)
      ctx.beginPath()
      for (let i = 0; i < NUM_POINTS; i++) {
        const angle = startAngle + i * angleStep
        const value = current[i]
        const x = cx + Math.cos(angle) * radius * value
        const y = cy + Math.sin(angle) * radius * value
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.12)')
      gradient.addColorStop(0.6, 'rgba(0, 212, 255, 0.05)')
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.02)')
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      rafId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    rafId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden">
      {/* Opaque circle masks the grid so it doesn't show under the wheel */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--background)]"
        style={{ width: '104vmin', height: '104vmin' }}
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />
    </div>
  )
}
