import { openDB, type IDBPDatabase } from 'idb'
import type { Task } from '../api/tasks'

interface TackMoreDBSchema {
  tasks: {
    key: number
    value: Task
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

const DB_NAME = 'tackmore-offline'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<TackMoreDBSchema>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TackMoreDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('tasks', 'readwrite')
  await tx.store.clear()
  for (const task of tasks) {
    await tx.store.put(task)
  }
  await tx.done

  const metaTx = db.transaction('meta', 'readwrite')
  await metaTx.store.put({
    key: 'tasks-last-sync',
    value: new Date().toISOString(),
  })
  await metaTx.done
}

export async function loadTasks(): Promise<Task[] | null> {
  try {
    const db = await getDb()
    const tasks = await db.getAll('tasks')
    return tasks.length > 0 ? tasks : null
  } catch {
    return null
  }
}
