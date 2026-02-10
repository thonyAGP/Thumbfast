"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Download, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OUTPUT_MODES, GRID_OPTIONS } from "@/lib/generation-config"
import type { HistoryEntry, HistorySettings } from "@/lib/history"

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const SettingsBadges = ({ settings }: { settings: HistorySettings }) => {
  const modeLabels = settings.modes
    .map((m) => OUTPUT_MODES.find((o) => o.id === m)?.label ?? m)
    .join(", ")
  const gridLabel = GRID_OPTIONS.find((g) => g.value === settings.grid)?.label ?? "Single"

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {settings.model.includes("flash") ? "Flash" : "Pro"}
      </span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {modeLabels}
      </span>
      {settings.grid > 1 && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {gridLabel}
          {settings.blend ? " + Blend" : ""}
        </span>
      )}
      {settings.count > 1 && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          x{settings.count}
        </span>
      )}
    </div>
  )
}

const downloadImage = (data: string, mediaType: string, index: number) => {
  const ext = mediaType.split("/")[1] ?? "png"
  const link = document.createElement("a")
  link.href = `data:${mediaType};base64,${data}`
  link.download = `thumbfast-${Date.now()}-${index + 1}.${ext}`
  link.click()
}

interface HistoryPanelProps {
  entries: HistoryEntry[]
  onRestore: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export const HistoryPanel = ({
  entries,
  onRestore,
  onRemove,
  onClear,
}: HistoryPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-sm font-semibold hover:text-foreground text-muted-foreground transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          History ({entries.length})
        </button>
        {isOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-card"
              >
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                >
                  {/* Thumbnail preview */}
                  {entry.images[0] && (
                    <img
                      src={`data:${entry.images[0].mediaType};base64,${entry.images[0].data}`}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <p className="text-sm truncate">{entry.prompt}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDate(entry.timestamp)}
                      </span>
                      <SettingsBadges settings={entry.settings} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {entry.images.length} img
                  </span>
                </button>

                {/* Expanded: images + actions */}
                {isExpanded && (
                  <div className="border-t border-border p-3 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {entry.images.map((img, i) => (
                        <div key={i} className="group relative">
                          <img
                            src={`data:${img.mediaType};base64,${img.data}`}
                            alt={`History ${i + 1}`}
                            className="w-full rounded object-cover aspect-video"
                          />
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadImage(img.data, img.mediaType, i)
                            }}
                          >
                            <Download className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => onRestore(entry)}
                      >
                        Restore settings
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          onRemove(entry.id)
                          setExpandedId(null)
                        }}
                      >
                        <X className="size-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
