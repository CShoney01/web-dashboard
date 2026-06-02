import { useState, useEffect, useCallback } from 'react'
import { openDB } from 'idb'

const DB_NAME = 'dashboard-db'
const DB_VERSION = 1

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('memos')) {
        db.createObjectStore('memos', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', { keyPath: 'id' })
      }
    },
  })
}

export function useIndexedDB(storeName) {
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const db = await getDB()
    const all = await db.getAll(storeName)
    setItems(all.sort((a, b) => b.createdAt - a.createdAt))
  }, [storeName])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(async (item) => {
    const db = await getDB()
    const record = { ...item, id: crypto.randomUUID(), createdAt: Date.now() }
    await db.put(storeName, record)
    await load()
    return record
  }, [storeName, load])

  const update = useCallback(async (item) => {
    const db = await getDB()
    await db.put(storeName, { ...item, updatedAt: Date.now() })
    await load()
  }, [storeName, load])

  const remove = useCallback(async (id) => {
    const db = await getDB()
    await db.delete(storeName, id)
    await load()
  }, [storeName, load])

  return { items, add, update, remove, reload: load }
}
