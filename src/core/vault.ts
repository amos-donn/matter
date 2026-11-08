import type { AppData, StoredFileMeta, VaultMeta } from './types'
import {
  createVaultCredentials,
  decryptBytes,
  decryptText,
  deriveKey,
  encryptBytes,
  encryptText,
  rekeyVault,
  verifyPassphrase,
  type EncryptedPayload,
} from './crypto'
import {
  clearFileRecords,
  deleteFileRecord,
  listFileRecords,
  readFileRecord,
  readVault,
  writeFileRecord,
  writeVault,
  type FileRecord,
} from './db'
import { createInitialData } from './seed'
import { APP_VERSION, SCHEMA_VERSION } from './constants'
import { b64ToBytes, bytesToB64, nowIso, uid } from './util'

export type UnlockResult =
  | { ok: true; key: CryptoKey; meta: VaultMeta; data: AppData }
  | { ok: false; error: string }

export interface SessionPayload {
  key: CryptoKey
  meta: VaultMeta
  data: AppData
}

export async function vaultExists(): Promise<boolean> {
  return Boolean(await readVault())
}

export async function createVault(
  passphrase: string,
  user: string,
  dataFolder: string,
): Promise<SessionPayload> {
  const { key, meta } = await createVaultCredentials(passphrase)
  const data = createInitialData(user)
  data.settings.dataFolder = dataFolder || data.settings.dataFolder
  data.audit.push({
    id: uid('aud'),
    at: nowIso(),
    user: data.user,
    action: 'Create',
    objectType: 'Vault',
    objectName: 'Local workspace',
    detail: 'Encrypted local store initialized',
  })
  await persistVault(key, meta, data)
  return { key, meta, data }
}

export async function unlockVault(passphrase: string): Promise<UnlockResult> {
  const record = await readVault()
  if (!record?.payload) return { ok: false, error: 'No local workspace was found on this computer.' }
  const key = await verifyPassphrase(record.meta, passphrase)
  if (!key) return { ok: false, error: "That passphrase doesn't match this workspace. Try again." }
  try {
    const plain = await decryptText(key, record.payload)
    const data = JSON.parse(plain) as AppData
    return { ok: true, key, meta: record.meta, data }
  } catch {
    return {
      ok: false,
      error: 'The workspace could not be decrypted. The data file may be damaged. Restore a backup.',
    }
  }
}

export async function persistVault(key: CryptoKey, meta: VaultMeta, data: AppData): Promise<VaultMeta> {
  const payload = await encryptText(key, JSON.stringify(data))
  const nextMeta: VaultMeta = { ...meta, updatedAt: nowIso() }
  await writeVault({ meta: nextMeta, payload })
  return nextMeta
}

export async function changePassphrase(
  currentPassphrase: string,
  nextPassphrase: string,
  key: CryptoKey,
  meta: VaultMeta,
  data: AppData,
): Promise<{ key: CryptoKey; meta: VaultMeta }> {
  const verified = await verifyPassphrase(meta, currentPassphrase)
  if (!verified) throw new Error('The current passphrase is not correct.')
  const rekeyed = await rekeyVault(nextPassphrase, meta)
  // Re-encrypt every stored file with the new key.
  const files = await listFileRecords()
  for (const file of files) {
    const bytes = await decryptBytes(key, { iv: file.iv, data: file.data })
    const encrypted = await encryptBytes(rekeyed.key, bytes)
    await writeFileRecord({ ...file, iv: encrypted.iv, data: encrypted.data })
  }
  await persistVault(rekeyed.key, rekeyed.meta, data)
  return rekeyed
}

export async function saveFile(
  key: CryptoKey,
  name: string,
  mime: string,
  bytes: Uint8Array,
): Promise<StoredFileMeta> {
  const id = uid('file')
  const encrypted = await encryptBytes(key, bytes)
  const meta: StoredFileMeta = {
    id,
    name,
    mime,
    size: bytes.byteLength,
    createdAt: nowIso(),
  }
  await writeFileRecord({ ...meta, iv: encrypted.iv, data: encrypted.data })
  return meta
}

export async function loadFile(key: CryptoKey, id: string): Promise<{ meta: StoredFileMeta; bytes: Uint8Array } | null> {
  const record = await readFileRecord(id)
  if (!record) return null
  const bytes = await decryptBytes(key, { iv: record.iv, data: record.data })
  return {
    meta: { id: record.id, name: record.name, mime: record.mime, size: record.size, createdAt: record.createdAt },
    bytes,
  }
}

export async function removeFile(id: string): Promise<void> {
  await deleteFileRecord(id)
}

/* ------------------------------------------------------------------ */
/* Encrypted backup                                                    */
/* ------------------------------------------------------------------ */

interface BackupFile {
  meta: StoredFileMeta
  iv: string
  data: string
}

interface BackupHeader {
  format: 'matter-workspace-backup'
  version: 1
  appVersion: string
  createdAt: string
  user: string
  kdf: { salt: string; iterations: number }
  payload: { iv: string; data: string }
  files: BackupFile[]
}

export async function createBackup(
  key: CryptoKey,
  data: AppData,
  passphrase: string,
): Promise<Blob> {
  // Derive a fresh key for the backup so the file can be restored with the passphrase alone.
  const { key: backupKey, meta } = await createVaultCredentials(passphrase)
  const plainPayload = JSON.stringify(data)
  const payload = await encryptText(backupKey, plainPayload)
  const files = await listFileRecords()
  const backupFiles: BackupFile[] = []
  for (const file of files) {
    const bytes = await decryptBytes(key, { iv: file.iv, data: file.data })
    const encrypted = await encryptBytes(backupKey, bytes)
    backupFiles.push({
      meta: { id: file.id, name: file.name, mime: file.mime, size: file.size, createdAt: file.createdAt },
      iv: encrypted.iv,
      data: bytesToB64(new Uint8Array(encrypted.data)),
    })
  }
  const header: BackupHeader = {
    format: 'matter-workspace-backup',
    version: 1,
    appVersion: APP_VERSION,
    createdAt: nowIso(),
    user: data.user,
    kdf: { salt: meta.salt, iterations: meta.iterations },
    payload: { iv: payload.iv, data: bytesToB64(new Uint8Array(payload.data)) },
    files: backupFiles,
  }
  return new Blob([JSON.stringify(header)], { type: 'application/json' })
}

export async function restoreBackup(
  passphrase: string,
  backupText: string,
): Promise<SessionPayload> {
  let header: BackupHeader
  try {
    header = JSON.parse(backupText) as BackupHeader
  } catch {
    throw new Error('That file is not a Legal Matter Workspace backup.')
  }
  if (header.format !== 'matter-workspace-backup' || header.version !== 1) {
    throw new Error('That file is not a Legal Matter Workspace backup.')
  }
  const key = await deriveKey(passphrase, header.kdf.salt, header.kdf.iterations)
  let data: AppData
  try {
    const plain = await decryptText(key, {
      iv: header.payload.iv,
      data: b64ToBytes(header.payload.data).buffer as ArrayBuffer,
    })
    data = JSON.parse(plain) as AppData
  } catch {
    throw new Error('The backup could not be decrypted. Check the passphrase used when it was made.')
  }
  if (!data.schemaVersion || !Array.isArray(data.cases)) {
    throw new Error('The backup does not contain a workspace.')
  }
  await clearFileRecords()
  for (const file of header.files || []) {
    const bytes = await decryptBytes(key, {
      iv: file.iv,
      data: b64ToBytes(file.data).buffer as ArrayBuffer,
    })
    await writeFileRecord({
      ...file.meta,
      iv: file.iv,
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    })
  }
  const { key: newKey, meta } = await createVaultCredentials(passphrase)
  const payload = await encryptText(newKey, JSON.stringify(data))
  await writeVault({ meta, payload })
  return { key: newKey, meta, data }
}

/* ------------------------------------------------------------------ */
/* Browser-safe file helpers                                           */
/* ------------------------------------------------------------------ */

export function blobFromBytes(bytes: Uint8Array, mime: string): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime })
}

export const VAULT_SCHEMA = SCHEMA_VERSION
