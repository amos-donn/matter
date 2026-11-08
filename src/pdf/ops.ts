import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import type { BatesSettings } from '../core/types'

export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return pdf.getPageCount()
}

export async function pdfHasFormFields(bytes: Uint8Array): Promise<boolean> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return pdf.getForm().getFields().length > 0
  } catch {
    return false
  }
}

export async function combinePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const file of files) {
    const source = await PDFDocument.load(file, { ignoreEncryption: true })
    const pages = await out.copyPages(source, source.getPageIndices())
    pages.forEach(p => out.addPage(p))
  }
  return out.save()
}

export async function extractPdfPages(bytes: Uint8Array, zeroBasedPages: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const out = await PDFDocument.create()
  const valid = zeroBasedPages.filter(i => i >= 0 && i < source.getPageCount())
  if (!valid.length) throw new Error('Choose at least one page to extract.')
  const pages = await out.copyPages(source, valid)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

export async function deletePdfPages(bytes: Uint8Array, zeroBasedPages: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const out = await PDFDocument.create()
  const keep = source.getPageIndices().filter(i => !zeroBasedPages.includes(i))
  if (!keep.length) throw new Error('A PDF needs at least one page.')
  const pages = await out.copyPages(source, keep)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

export async function reorderPdfPages(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const count = source.getPageCount()
  if (order.length !== count || new Set(order).size !== count || order.some(i => i < 0 || i >= count)) {
    throw new Error('The new page order is incomplete.')
  }
  const out = await PDFDocument.create()
  const pages = await out.copyPages(source, order)
  pages.forEach(p => out.addPage(p))
  return out.save()
}

export async function rotatePdfPages(
  bytes: Uint8Array,
  rotationByPage: Record<number, number>,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  pdf.getPages().forEach((page, index) => {
    const delta = rotationByPage[index] || 0
    if (delta) page.setRotation(degrees((page.getRotation().angle + delta) % 360))
  })
  return pdf.save()
}

export async function splitPdfAfter(
  bytes: Uint8Array,
  afterPage: number,
): Promise<{ first: Uint8Array; second: Uint8Array }> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const count = source.getPageCount()
  if (afterPage < 1 || afterPage >= count) {
    throw new Error(`Choose a page between 1 and ${count - 1} to split after.`)
  }
  const firstDoc = await PDFDocument.create()
  const secondDoc = await PDFDocument.create()
  const firstPages = await firstDoc.copyPages(source, source.getPageIndices().slice(0, afterPage))
  firstPages.forEach(p => firstDoc.addPage(p))
  const secondPages = await secondDoc.copyPages(source, source.getPageIndices().slice(afterPage))
  secondPages.forEach(p => secondDoc.addPage(p))
  return { first: await firstDoc.save(), second: await secondDoc.save() }
}

export interface BatesResult {
  bytes: Uint8Array
  start: number
  end: number
}

export async function stampBates(bytes: Uint8Array, settings: Omit<BatesSettings, 'appliedAt'>): Promise<BatesResult> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const prefix = settings.prefix || ''
  const start = Math.max(0, Number(settings.start) || 1)
  const pages = pdf.getPages()
  let n = start
  for (const page of pages) {
    const label = `${prefix}${String(n).padStart(6, '0')}`
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(label, 9)
    const margin = 36
    let x = width - margin - textWidth
    let y = 18
    if (settings.placement === 'Bottom center') {
      x = (width - textWidth) / 2
      y = 18
    } else if (settings.placement === 'Top right') {
      x = width - margin - textWidth
      y = height - 24
    }
    page.drawText(label, {
      x,
      y,
      size: 9,
      font,
      color: rgb(0.12, 0.12, 0.12),
    })
    n++
  }
  return { bytes: await pdf.save(), start, end: n - 1 }
}

export async function flattenPdfForms(bytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = pdf.getForm()
  if (form.getFields().length) {
    form.flatten()
    return pdf.save()
  }
  return bytes
}

export async function pdfBytesSummary(bytes: Uint8Array): Promise<{ pages: number; hasForms: boolean }> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return { pages: pdf.getPageCount(), hasForms: pdf.getForm().getFields().length > 0 }
  } catch {
    throw new Error('That file is not a PDF the app can read. Export it again or replace it.')
  }
}
