"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "thumbfast-stats"

export const MODEL_OPTIONS = [
  { id: "gemini-2.5-flash-image", label: "Flash (free)", cost: 0 },
  { id: "gemini-3-pro-image-preview", label: "Pro ($0.13/img)", cost: 0.134 },
] as const

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"]

const getCostPerImage = (model: ModelId) =>
  MODEL_OPTIONS.find((m) => m.id === model)?.cost ?? 0

interface GenerationStats {
  totalImages: number
  totalRequests: number
  estimatedCost: number
  lastGenerationCost: number
  lastReset: string
}

const defaultStats: GenerationStats = {
  totalImages: 0,
  totalRequests: 0,
  estimatedCost: 0,
  lastGenerationCost: 0,
  lastReset: new Date().toISOString(),
}

export const useGenerationStats = () => {
  const [stats, setStats] = useState<GenerationStats>(defaultStats)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setStats(JSON.parse(stored) as GenerationStats)
    }
  }, [])

  const trackGeneration = useCallback(
    (imageCount: number, model: ModelId) => {
      const costPerImage = getCostPerImage(model)
      const generationCost =
        Math.round(imageCount * costPerImage * 1000) / 1000
      const updated: GenerationStats = {
        ...stats,
        totalImages: stats.totalImages + imageCount,
        totalRequests: stats.totalRequests + 1,
        estimatedCost:
          Math.round((stats.estimatedCost + generationCost) * 1000) / 1000,
        lastGenerationCost: generationCost,
      }
      setStats(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    },
    [stats]
  )

  const resetStats = useCallback(() => {
    const reset = { ...defaultStats, lastReset: new Date().toISOString() }
    setStats(reset)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset))
  }, [])

  return { stats, trackGeneration, resetStats }
}
