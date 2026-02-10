import type { OutputMode, GridLayout } from "./generation-config"
import type { ModelId } from "@/hooks/use-generation-stats"

export interface HistoryImage {
  data: string
  mediaType: string
}

export interface HistorySettings {
  model: ModelId
  modes: OutputMode[]
  grid: GridLayout
  blend: boolean
  count: number
}

export interface HistoryEntry {
  id: string
  timestamp: number
  prompt: string
  settings: HistorySettings
  images: HistoryImage[]
}

const DB_NAME = "thumbfast-history"
const STORE_NAME = "generations"
const DB_VERSION = 1
const MAX_ENTRIES = 50

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("timestamp", "timestamp", { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

export const historyDB = {
  async getAll(): Promise<HistoryEntry[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const index = store.index("timestamp")
      const req = index.getAll()
      req.onsuccess = () => {
        const entries = req.result as HistoryEntry[]
        resolve(entries.reverse())
      }
      req.onerror = () => reject(req.error)
    })
  },

  async add(entry: HistoryEntry): Promise<void> {
    const db = await openDB()

    // Prune if over limit
    const all = await this.getAll()
    if (all.length >= MAX_ENTRIES) {
      const toDelete = all.slice(MAX_ENTRIES - 1)
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      for (const old of toDelete) {
        store.delete(old.id)
      }
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve()
      })
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async remove(id: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async clear(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}
