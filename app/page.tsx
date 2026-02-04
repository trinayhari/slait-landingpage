'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import RotatingText from '@/components/RotatingText'
import UploadZone from '@/components/UploadZone'
import CandidateGallery from '@/components/CandidateGallery'
import AnalysisResults from '@/components/AnalysisResults'
import Footer from '@/components/Footer'
import { AIUsageAnalysis } from '@/lib/types'

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIUsageAnalysis | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY })
        rafRef.current = 0
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <main className="min-h-screen w-full overflow-hidden terminal-bg">
      {/* Static pixelated dither layer - always exists */}
      <div className="fixed inset-0 pixel-dither pointer-events-none opacity-0" id="dither-layer" />

      {/* Grid overlay background */}
      <div className="fixed inset-0 grid-overlay pointer-events-none" />

      {/* Mouse spotlight that reveals the dither */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, #0a0e14 100%)`,
        }}
      />
      
      {/* Dither layer revealed by mouse */}
      <div 
        className="fixed inset-0 pixel-dither pointer-events-none"
        style={{
          maskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle 250px at ${mousePos.x}px ${mousePos.y}px, black 0%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-4 py-6">
        {/* Header */}
        <Header />

        {/* Main Content */}
        {analysisResult ? (
          <div className="w-full flex-1 py-8">
            <AnalysisResults
              analysis={analysisResult}
              onReset={() => setAnalysisResult(null)}
            />
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 flex-1">
            {/* Upload Zone - Main CTA */}
            <div className="w-full lg:w-1/2">
              <RotatingText />
              <UploadZone
                isAnalyzing={isAnalyzing}
                setIsAnalyzing={setIsAnalyzing}
                onAnalysisComplete={setAnalysisResult}
              />
            </div>

            {/* Candidate Gallery */}
            <div className="w-full lg:w-1/2">
              <CandidateGallery />
            </div>
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </main>
  )
}
