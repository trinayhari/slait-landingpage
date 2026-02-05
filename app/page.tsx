'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import RotatingText from '@/components/RotatingText'
import UploadZone from '@/components/UploadZone'
import EarlyAccess from '@/components/EarlyAccess'
import CandidateGallery from '@/components/CandidateGallery'
import AnalysisResults from '@/components/AnalysisResults'
import Footer from '@/components/Footer'
import { AIUsageAnalysis } from '@/lib/types'

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIUsageAnalysis | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
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

      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-4 py-4">
        {/* Header */}
        <Header fileName={fileName} />

        {/* Main Content */}
        {analysisResult ? (
          <div className="w-full flex-1 py-8">
            <AnalysisResults
              analysis={analysisResult}
              onReset={() => setAnalysisResult(null)}
            />
          </div>
        ) : (
          <div className="w-full max-w-6xl flex flex-col items-center justify-center gap-4 flex-1">
            {/* Rotating Text - Above boxes */}
            <RotatingText />

            {/* Three columns */}
            <div className="w-full flex flex-col lg:flex-row items-stretch justify-center gap-6">
              {/* Candidate Gallery - Left */}
              <div className="w-full lg:w-1/3 flex">
                <CandidateGallery />
              </div>

              {/* Upload Zone - Center */}
              <div className="w-full lg:w-1/3 flex">
                <UploadZone
                  isAnalyzing={isAnalyzing}
                  setIsAnalyzing={setIsAnalyzing}
                  onAnalysisComplete={setAnalysisResult}
                  fileName={fileName}
                  setFileName={setFileName}
                />
              </div>

              {/* Early Access - Right */}
              <div className="w-full lg:w-1/3 flex">
                <EarlyAccess />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <Footer />
      </div>
    </main>
  )
}
