"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { DropZone } from "@/components/drop-zone"
import { HistoryPanel } from "@/components/history-panel"
import {
  useGenerationStats,
  MODEL_OPTIONS,
  type ModelId,
} from "@/hooks/use-generation-stats"
import { useHistory } from "@/hooks/use-history"
import {
  OUTPUT_MODES,
  GRID_OPTIONS,
  type OutputMode,
  type GridLayout,
} from "@/lib/generation-config"
import type { HistoryEntry } from "@/lib/history"

interface GeneratedImage {
  data: string
  mediaType: string
}

const downloadImage = (data: string, mediaType: string, index: number) => {
  const ext = mediaType.split("/")[1] ?? "png"
  const link = document.createElement("a")
  link.href = `data:${mediaType};base64,${data}`
  link.download = `thumbfast-${Date.now()}-${index + 1}.${ext}`
  link.click()
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [extraImages, setExtraImages] = useState<string[]>([])
  const [inspiration, setInspiration] = useState<string[]>([])
  const [persons, setPersons] = useState<string[]>([])
  const [count, setCount] = useState(1)
  const [model, setModel] = useState<ModelId>("gemini-2.5-flash-image")
  const [modes, setModes] = useState<OutputMode[]>(["thumbnail"])
  const [grid, setGrid] = useState<GridLayout>(1)
  const [blend, setBlend] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [previewImages, setPreviewImages] = useState<GeneratedImage[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const { stats, trackGeneration, resetStats } = useGenerationStats()
  const history = useHistory()

  const openPreview = (images: GeneratedImage[], index: number) => {
    setPreviewImages(images)
    setPreviewIndex(index)
  }

  const closePreview = () => setPreviewImages([])

  const handlePreviewKey = useCallback(
    (e: KeyboardEvent) => {
      if (previewImages.length <= 1) return
      if (e.key === "ArrowRight") setPreviewIndex((i) => (i + 1) % previewImages.length)
      if (e.key === "ArrowLeft") setPreviewIndex((i) => (i - 1 + previewImages.length) % previewImages.length)
    },
    [previewImages.length]
  )

  useEffect(() => {
    if (previewImages.length === 0) return
    window.addEventListener("keydown", handlePreviewKey)
    return () => window.removeEventListener("keydown", handlePreviewKey)
  }, [previewImages.length, handlePreviewKey])

  const toggleMode = (id: OutputMode) => {
    setModes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const restoreFromHistory = (entry: HistoryEntry) => {
    setPrompt(entry.prompt)
    setModel(entry.settings.model)
    setModes(entry.settings.modes)
    setGrid(entry.settings.grid)
    setBlend(entry.settings.blend)
    setCount(entry.settings.count)
    toast.success("Settings restored from history")
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }
    if (modes.length === 0) {
      toast.error("Please select at least one output mode")
      return
    }

    setIsGenerating(true)
    setGeneratedImages([])

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          extraImages,
          inspirationImages: inspiration,
          personImages: persons,
          model,
          modes,
          grid,
          blend,
          count,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error ?? "Generation failed")
      }

      const data = (await response.json()) as {
        images: GeneratedImage[]
        model: string
      }

      if (data.images.length === 0) {
        toast.error("No images were generated. Try a different prompt.")
        return
      }

      setGeneratedImages(data.images)
      trackGeneration(data.images.length, model)

      history.add({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompt: prompt.trim(),
        settings: { model, modes, grid, blend, count },
        images: data.images,
      })

      toast.success(`${data.images.length} image(s) generated!`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background bg-[url('/bg.png')] bg-cover bg-center bg-fixed bg-no-repeat">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12 my-6 rounded-2xl bg-background/60 backdrop-blur-md border border-border/40">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/logo.png"
            alt="Thumbfast"
            className="size-16 rounded-xl"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Thumbfast{" "}
              <span className="text-muted-foreground font-normal text-lg">
                by Opus 4.6
              </span>
            </h1>
            <p className="text-muted-foreground">
              Generate images with AI
            </p>
          </div>
        </div>

        {/* Prompt */}
        <Textarea
          placeholder="Describe your YouTube thumbnail... (e.g., 'A developer looking shocked at a screen showing code, with bold text REACT IS DEAD')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-28 resize-none text-base"
        />

        {/* Drop Zones */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DropZone
            label="Extra Images"
            multiple
            images={extraImages}
            onImagesChange={setExtraImages}
          />
          <DropZone
            label="Inspiration"
            images={inspiration}
            onImagesChange={setInspiration}
          />
          <DropZone
            label="Persons"
            multiple
            images={persons}
            onImagesChange={setPersons}
          />
        </div>

        {/* Output Modes */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Output Modes
          </span>
          <div className="flex flex-wrap gap-3">
            {OUTPUT_MODES.map((mode) => (
              <label
                key={mode.id}
                className="flex items-center gap-2 cursor-pointer"
                title={mode.description}
              >
                <Checkbox
                  checked={modes.includes(mode.id)}
                  onCheckedChange={() => toggleMode(mode.id)}
                />
                <span className="text-sm">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Model + Layout + Blend + Count + Generate */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          {/* Model selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Model
            </span>
            <div className="flex gap-1">
              {MODEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setModel(opt.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    model === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Layout
            </span>
            <div className="flex gap-1">
              {GRID_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setGrid(opt.value)
                    if (opt.value === 1) setBlend(false)
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    grid === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blend checkbox */}
          <div className="flex items-center gap-2 pb-0.5">
            <Checkbox
              id="blend"
              checked={blend}
              onCheckedChange={(checked) => setBlend(checked === true)}
              disabled={grid === 1}
            />
            <label
              htmlFor="blend"
              className={`text-sm cursor-pointer ${grid === 1 ? "text-muted-foreground/50" : ""}`}
            >
              Blend
            </label>
          </div>

          {/* Count slider */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Count
              </span>
              <span className="text-sm font-medium tabular-nums">{count}</span>
            </div>
            <Slider
              value={[count]}
              onValueChange={(v) => setCount(v[0])}
              min={1}
              max={4}
              step={1}
            />
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || modes.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {/* Loading Skeletons */}
        {isGenerating && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: count }, (_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Generated Thumbnails */}
        {generatedImages.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Generated Thumbnails</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generatedImages.map((img, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={`Generated thumbnail ${index + 1}`}
                    className="aspect-video w-full cursor-pointer object-cover"
                    onClick={() => openPreview(generatedImages, index)}
                  />
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() =>
                      downloadImage(img.data, img.mediaType, index)
                    }
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Preview Dialog */}
        <Dialog
          open={previewImages.length > 0}
          onOpenChange={(open) => !open && closePreview()}
        >
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            {previewImages[previewIndex] && (
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-full">
                  <img
                    src={`data:${previewImages[previewIndex].mediaType};base64,${previewImages[previewIndex].data}`}
                    alt={`Preview ${previewIndex + 1}`}
                    className="w-full rounded-lg"
                  />
                  {previewImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((i) => (i - 1 + previewImages.length) % previewImages.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                      >
                        <ChevronLeft className="size-6" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((i) => (i + 1) % previewImages.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                      >
                        <ChevronRight className="size-6" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {previewImages.length > 1 && (
                    <span className="text-xs text-white/70">
                      {previewIndex + 1} / {previewImages.length}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() =>
                      downloadImage(
                        previewImages[previewIndex].data,
                        previewImages[previewIndex].mediaType,
                        previewIndex
                      )
                    }
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* History */}
        <HistoryPanel
          entries={history.entries}
          onRestore={restoreFromHistory}
          onRemove={history.remove}
          onClear={history.clear}
          onPreview={(images, index) => openPreview(images, index)}
        />

        {/* Cost Tracker */}
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span>{stats.totalRequests} requests</span>
            <span>{stats.totalImages} images</span>
            <span>~${stats.estimatedCost.toFixed(2)} USD</span>
            {stats.lastGenerationCost > 0 && (
              <span>(last: ${stats.lastGenerationCost.toFixed(3)})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={resetStats}
            title="Reset stats"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
