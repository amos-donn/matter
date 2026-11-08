import type { DocBlock } from '../core/types'
import {
  combinePdfs,
  extractPdfPages,
  pdfBytesSummary,
  reorderPdfPages,
  rotatePdfPages,
  stampBates,
} from '../pdf/ops'

/** Insert a citation or exhibit token after the selected sentence, or at the end of the block. */
export function insertionToken(
  blocks: DocBlock[],
  blockId: string | undefined,
  token: string,
  selectedText: string,
): { blocks: DocBlock[]; blockId: string | null } {
  const target = blockId
    ? blocks.findIndex(b => b.id === blockId)
    : blocks.map(b => b.type).lastIndexOf('paragraph')
  if (target < 0 || !blocks[target]) {
    return { blocks, blockId: null }
  }
  const block = blocks[target]
  let text = block.text
  if (selectedText && text.includes(selectedText)) {
    const start = text.indexOf(selectedText) + selectedText.length
    const rest = text.slice(start)
    const sentenceEnd = rest.search(/[.!?](\s|$)/)
    const at = sentenceEnd >= 0 ? start + sentenceEnd + 1 : start
    text = `${text.slice(0, at).trimEnd()} ${token}${text.slice(at)}`
  } else {
    text = `${text.trimEnd()}${text.trim() ? ' ' : ''}${token}`
  }
  const next = blocks.map((b, i) => (i === target ? { ...b, text } : b))
  return { blocks: next, blockId: block.id }
}

export async function getPdfSummary(bytes: Uint8Array) {
  return pdfBytesSummary(bytes)
}

export async function stampExhibit(
  bytes: Uint8Array,
  settings: { prefix: string; start: number; placement: 'Bottom right' | 'Bottom center' | 'Top right' },
) {
  return stampBates(bytes, { ...settings, end: 0 })
}

export async function combineFiles(files: Uint8Array[]) {
  if (files.length < 2) throw new Error('Choose at least two PDF files.')
  return combinePdfs(files)
}

export async function organizeApply(bytes: Uint8Array, order: number[], rotation: Record<number, number>) {
  let next = await reorderPdfPages(bytes, order)
  if (Object.values(rotation).some(Boolean)) {
    next = await rotatePdfPages(next, rotation)
  }
  return next
}

export async function organizeLoad(bytes: Uint8Array) {
  return pdfBytesSummary(bytes)
}

export async function extractSelected(bytes: Uint8Array, pages: number[]) {
  return extractPdfPages(bytes, pages)
}

export async function savePdfToExhibit(bytes: Uint8Array) {
  return bytes
}

export async function splitExhibit(bytes: Uint8Array, afterPage: number) {
  const { splitPdfAfter } = await import('../pdf/ops')
  return splitPdfAfter(bytes, afterPage)
}
