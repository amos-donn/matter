import type { ISODate, DeadlineStatus } from './types'

export function uid(prefix = ''): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  const body = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return (prefix ? prefix + '_' : '') + body
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const buffer = new ArrayBuffer(binary.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function todayIso(): ISODate {
  const d = new Date()
  return toIsoDate(d)
}

export function toIsoDate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

export function rollToBusinessDay(iso: ISODate, holidays: string[] = []): ISODate {
  let d = parseIsoDate(iso)
  let guard = 0
  while ((isWeekend(d) || holidays.includes(toIsoDate(d))) && guard < 14) {
    d = new Date(d.getTime() + 86_400_000)
    guard++
  }
  return toIsoDate(d)
}

export function daysBetween(fromIso: ISODate, toIso: ISODate): number {
  const a = parseIsoDate(fromIso).getTime()
  const b = parseIsoDate(toIso).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function daysFromToday(iso: ISODate): number {
  return daysBetween(todayIso(), iso)
}

export function formatDate(iso: ISODate | string | undefined): string {
  if (!iso) return '—'
  const d = iso.length <= 10 ? parseIsoDate(iso as ISODate) : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatShortDate(iso: ISODate | string | undefined): string {
  if (!iso) return '—'
  const d = iso.length <= 10 ? parseIsoDate(iso as ISODate) : new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}

export function deadlineStatus(date: ISODate, override: boolean): DeadlineStatus {
  if (override) return 'Overridden'
  const diff = daysFromToday(date)
  if (diff < 0) return 'Overdue'
  if (diff <= 7) return 'Due Soon'
  return 'Upcoming'
}

export function deadlinePhrase(date: ISODate): string {
  const diff = daysFromToday(date)
  if (diff === 0) return 'due today'
  if (diff === 1) return 'due tomorrow'
  if (diff > 1) return `due in ${diff} days`
  if (diff === -1) return '1 day overdue'
  return `${Math.abs(diff)} days overdue`
}

export function money(value: string): string {
  const n = Number(String(value).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || !String(value).trim()) return value || '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function fileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function wordCount(text: string): number {
  const cleaned = text.replace(/\{\{[^}]*\}\}/g, ' ').trim()
  return cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0
}

export function excerpt(text: string, query: string, radius = 70): string {
  const plain = stripTokens(text).replace(/\s+/g, ' ')
  const idx = plain.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return plain.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(plain.length, idx + query.length + radius)
  return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '')
}

export function stripTokens(text: string): string {
  return text
    .replace(/\{\{cite:([^}:|]+)(?::([^}|]*))?(?:\|([^}]*))?\}\}/g, (_m, _id, _pin, label) => label || '')
    .replace(/\{\{ex:([^}:|]+)(?::([^}]*))?(?:\|([^}]*))?\}\}/g, (_m, _id, _page, label) => label || '')
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const k = key(item)
    ;(out[k] ||= []).push(item)
  }
  return out
}

export function sortBy<T>(items: T[], key: (item: T) => string | number): T[] {
  return [...items].sort((a, b) => {
    const av = key(a)
    const bv = key(b)
    return av < bv ? -1 : av > bv ? 1 : 0
  })
}

export function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function safeFilename(name: string, fallback = 'document'): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || fallback
}
