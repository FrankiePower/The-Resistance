"use client"

import { useProgress } from "@react-three/drei"
import { useEffect, useState } from "react"

export function Loader() {
  const { progress } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(timer)
    }
  }, [progress])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center z-50 transition-opacity duration-500"
      style={{ opacity: progress === 100 ? 0 : 1 }}
    >
      <div className="text-center">
        <div className="text-white text-2xl font-bold mb-4">🌌</div>
        <div className="text-white font-mono">Loading Galaxy...</div>
        <div className="text-white/60 font-mono text-sm mt-2">{progress.toFixed(0)}%</div>
      </div>
    </div>
  )
}
