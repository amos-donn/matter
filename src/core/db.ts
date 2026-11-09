import type { StoredFileMeta, VaultMeta } from './types'

// Separate store for the login-free prototype so legacy passphrase vaults are not overwritten.
const DB_NAME = 'matter-workspace-prototype'
const DB_VERSION = 1
const VAULT_STORE = 'vault'
const FILE_STORE = 'files'

export interface VaultRecord {
  meta: VaultMeta
  payload?: { iv: string; data: ArrayBuffer }
}

export interface FileRecord extends StoredFileMeta {
  iv: string
  data: ArrayBuffer
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE)
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('The local vault could not be opened.'))
    req.onblocked = () => reject(new Error('The local vault is locked by another window. Close other windows and try again.'))
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const request = run(transaction.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Local storage operation failed.'))
      }),
  )
}

export async function readVault(): Promise<VaultRecord | undefined> {
  return tx<VaultRecord | undefined>(VAULT_STORE, 'readonly', s => s.get('main'))
}

export async function writeVault(record: VaultRecord): Promise<void> {
  await tx(VAULT_STORE, 'readwrite', s => s.put(record, 'main'))
}

export async function writeFileRecord(record: FileRecord): Promise<void> {
  await tx(FILE_STORE, 'readwrite', s => s.put(record))
}

export async function readFileRecord(id: string): Promise<FileRecord | undefined> {
  return tx<FileRecord | undefined>(FILE_STORE, 'readonly', s => s.get(id))
}

export async function listFileRecords(): Promise<FileRecord[]> {
  return tx<FileRecord[]>(FILE_STORE, 'readonly', s => s.getAll())
}

export async function deleteFileRecord(id: string): Promise<void> {
  await tx(FILE_STORE, 'readwrite', s => s.delete(id))
}

export async function clearFileRecords(): Promise<void> {
  await tx(FILE_STORE, 'readwrite', s => s.clear())
}

export async function deleteVault(): Promise<void> {
  await tx(VAULT_STORE, 'readwrite', s => s.delete('main'))
}
