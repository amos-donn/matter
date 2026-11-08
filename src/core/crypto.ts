import type { VaultMeta } from './types'
import { b64ToBytes, bytesToB64 } from './util'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const KDF_ITERATIONS = 310_000
const VERIFIER_TEXT = 'matter-workspace:v1'

export interface EncryptedPayload {
  iv: string
  data: ArrayBuffer
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

function encode(text: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(text))
}

function storedToPayload(stored: { iv: string; data: string }): EncryptedPayload {
  return { iv: stored.iv, data: b64ToBytes(stored.data).buffer }
}

export async function deriveKey(
  passphrase: string,
  saltB64: string,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: b64ToBytes(saltB64),
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptText(key: CryptoKey, text: string): Promise<EncryptedPayload> {
  const iv = randomBytes(12)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encode(text))
  return { iv: bytesToB64(iv), data: cipher }
}

export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    payload.data,
  )
  return decoder.decode(plain)
}

export async function encryptBytes(key: CryptoKey, bytes: Uint8Array): Promise<EncryptedPayload> {
  const iv = randomBytes(12)
  const copy = bytes.slice()
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, copy.buffer as ArrayBuffer)
  return { iv: bytesToB64(iv), data: cipher }
}

export async function decryptBytes(key: CryptoKey, payload: EncryptedPayload): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    payload.data,
  )
  return new Uint8Array(plain)
}

export async function createVaultCredentials(passphrase: string): Promise<{
  meta: VaultMeta
  key: CryptoKey
}> {
  const salt = bytesToB64(randomBytes(16))
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
  const verifier = await encryptText(key, VERIFIER_TEXT)
  return {
    key,
    meta: {
      version: 1,
      salt,
      iterations: KDF_ITERATIONS,
      verifier: { iv: verifier.iv, data: bytesToB64(new Uint8Array(verifier.data)) },
      updatedAt: new Date().toISOString(),
    },
  }
}

export async function verifyPassphrase(meta: VaultMeta, passphrase: string): Promise<CryptoKey | null> {
  try {
    const key = await deriveKey(passphrase, meta.salt, meta.iterations)
    const plain = await decryptText(key, storedToPayload(meta.verifier))
    return plain === VERIFIER_TEXT ? key : null
  } catch {
    return null
  }
}

export async function rekeyVault(
  passphrase: string,
  currentMeta: VaultMeta,
): Promise<{ meta: VaultMeta; key: CryptoKey }> {
  const salt = bytesToB64(randomBytes(16))
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
  const verifier = await encryptText(key, VERIFIER_TEXT)
  return {
    key,
    meta: {
      ...currentMeta,
      salt,
      iterations: KDF_ITERATIONS,
      verifier: { iv: verifier.iv, data: bytesToB64(new Uint8Array(verifier.data)) },
      updatedAt: new Date().toISOString(),
    },
  }
}

export function passphraseStrength(passphrase: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (passphrase.length < 8) return { score: 0, label: 'Too short — use at least 8 characters' }
  let score = 1
  if (passphrase.length >= 14) score++
  if (/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase) && /[0-9]/.test(passphrase)) score++
  if (/[^A-Za-z0-9]/.test(passphrase)) score = Math.min(3, score + 1)
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  return { score: Math.min(3, score) as 0 | 1 | 2 | 3, label: labels[Math.min(3, score)] }
}
