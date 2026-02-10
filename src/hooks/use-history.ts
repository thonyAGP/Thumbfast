"use client"

import { useState, useEffect, useCallback } from "react"
import { historyDB, type HistoryEntry } from "@/lib/history"

export const useHistory = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const all = await historyDB.getAll()
      setEntries(all)
    } catch {
      // IndexedDB not available (SSR, private browsing)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(
    async (entry: HistoryEntry) => {
      await historyDB.add(entry)
      await load()
    },
    [load]
  )

  const remove = useCallback(
    async (id: string) => {
      await historyDB.remove(id)
      await load()
    },
    [load]
  )

  const clear = useCallback(async () => {
    await historyDB.clear()
    setEntries([])
  }, [])

  return { entries, isLoading, add, remove, clear }
}
