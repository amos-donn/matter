import type { AppData, DocBlock } from '../core/types'
import { citeDisplay, exhibitDisplay, findTokens } from '../core/citations'
import { uid } from '../core/util'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function blockHtml(data: AppData, text: string): string {
  const tokens = findTokens(text)
  if (!tokens.length) return escape(text).replace(/\n/g, '<br>')
  let out = ''
  let cursor = 0
  for (const token of tokens) {
    out += escape(text.slice(cursor, token.index)).replace(/\n/g, '<br>')
    if (token.kind === 'cite') {
      const shown = citeDisplay(data, token.id, token.detail)
      const tone =
        shown.status === 'Verified'
          ? 'cite-verified'
          : shown.status === 'Unverified'
            ? 'cite-unverified'
            : shown.status === 'Flagged'
              ? 'cite-flagged'
              : 'cite-missing'
      const mark =
        shown.status === 'Missing'
          ? '⚠ Missing'
          : shown.status === 'Verified'
            ? '✓ Verified'
            : shown.status === 'Unverified'
              ? '⚠ Unverified'
              : '⚑ Flagged'
      out += `<span class="cite-chip ${tone}" data-cite-id="${escape(token.id)}" data-detail="${escape(token.detail)}" contenteditable="false" title="${escape(shown.text)}">${escape(shown.text)}<span class="cite-mark">${mark}</span></span>`
    } else {
      const shown = exhibitDisplay(data, token.id, token.detail)
      out += `<span class="exhibit-chip ${shown.missing ? 'broken' : ''}" data-ex-id="${escape(token.id)}" data-ex-page="${escape(token.detail)}" contenteditable="false" title="Open exhibit">${escape(shown.text)}</span>`
    }
    cursor = token.index + token.raw.length
  }
  return out + escape(text.slice(cursor)).replace(/\n/g, '<br>')
}

export function serializeEditor(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  if (el.dataset.citeId) {
    return `{{cite:${el.dataset.citeId}${el.dataset.detail ? ':' + el.dataset.detail : ''}}}`
  }
  if (el.dataset.exId) {
    return `{{ex:${el.dataset.exId}${el.dataset.exPage ? ':' + el.dataset.exPage : ''}}}`
  }
  if (el.tagName === 'BR') return '\n'
  return Array.from(el.childNodes).map(serializeEditor).join('')
}

export function insertToken(
  blocks: DocBlock[],
  blockId: string | undefined,
  token: string,
  selectedText = '',
): { blocks: DocBlock[]; blockId: string } {
  const targetIndex = blockId ? blocks.findIndex(b => b.id === blockId) : blocks.length - 1
  const index = targetIndex >= 0 ? targetIndex : blocks.length - 1
  if (index < 0) {
    const block: DocBlock = { id: uid('blk'), type: 'paragraph', text: token }
    return { blocks: [block], blockId: block.id }
  }
  const next = blocks.map(b => ({ ...b }))
  const block = next[index]
  let text = block.text
  if (selectedText) {
    const at = text.indexOf(selectedText)
    if (at >= 0) {
      const after = at + selectedText.length
      const rest = text.slice(after)
      const boundary = rest.search(/[.!?](?=\s|$)/)
      const insertAt = boundary >= 0 ? after + boundary + 1 : text.length
      text = `${text.slice(0, insertAt).trimEnd()} ${token}${text.slice(insertAt)}`
    } else {
      text = `${text.trimEnd()} ${token}`
    }
  } else {
    text = `${text.trimEnd()}${text ? ' ' : ''}${token}`
  }
  block.text = text
  return { blocks: next, blockId: block.id }
}

export function blockLabel(type: DocBlock['type']): string {
  return type === 'caption'
    ? 'Caption'
    : type === 'heading'
      ? 'Heading'
      : type === 'quote'
        ? 'Block quote'
        : type === 'pagebreak'
          ? 'Page break'
          : type === 'tableOfAuthorities'
            ? 'Table of authorities'
            : type === 'tableOfContents'
              ? 'Table of contents'
              : type === 'exhibitIndex'
                ? 'Exhibit index'
                : type === 'certificateOfService'
                  ? 'Certificate of service'
                  : 'Body text'
}
