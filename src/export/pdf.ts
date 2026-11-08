import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { AppData, MatterCase, MatterDoc, Filing, DocBlock } from '../core/types'
import { findTokens } from '../core/citations'
import { buildExportModel, type ExportModel } from './model'
import { uid } from '../core/util'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 72
const CONTENT_W = PAGE_W - MARGIN * 2
const INK = rgb(0.07, 0.07, 0.07)
const GREY = rgb(0.38, 0.38, 0.38)
const FONT_SIZE = 12
const DOUBLE = 24

interface PageMap {
  authorityPages: Map<string, number[]>
  headingPages: Map<string, number>
}

interface RenderResult {
  bytes: Uint8Array
  map: PageMap
}

interface Line {
  text: string
  indent: number
}

function wrapLines(
  text: string,
  size: number,
  font: PDFFont,
  firstWidth: number,
  restWidth: number,
  firstIndent: number,
): Line[] {
  const out: Line[] = []
  const paragraphs = text.split('\n')
  let first = true

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push({ text: '', indent: first ? firstIndent : 0 })
      first = false
      continue
    }
    let line = ''
    let limit = first ? firstWidth : restWidth
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= limit) {
        line = candidate
        continue
      }
      if (line) {
        out.push({ text: line, indent: first ? firstIndent : 0 })
        first = false
        limit = restWidth
        line = word
        if (font.widthOfTextAtSize(line, size) > limit) {
          let chunk = ''
          for (const ch of line) {
            if (font.widthOfTextAtSize(chunk + ch, size) > limit) {
              out.push({ text: chunk, indent: first ? firstIndent : 0 })
              first = false
              chunk = ch
            } else {
              chunk += ch
            }
          }
          line = chunk
        }
      } else {
        let chunk = ''
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > limit) {
            out.push({ text: chunk, indent: first ? firstIndent : 0 })
            first = false
            chunk = ch
          } else {
            chunk += ch
          }
        }
        line = chunk
      }
    }
    if (line) {
      out.push({ text: line, indent: first ? firstIndent : 0 })
      first = false
    }
  }
  return out
}

async function renderPdf(
  data: AppData,
  doc: MatterDoc,
  model: ExportModel,
  prior?: PageMap,
): Promise<RenderResult> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(model.title)
  pdf.setAuthor(data.user)
  pdf.setCreator('Legal Matter Workspace')
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const boldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic)

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H])
  let pageNo = 1
  let y = PAGE_H - MARGIN

  const map: PageMap = { authorityPages: new Map(), headingPages: new Map() }

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H])
    pageNo++
    y = PAGE_H - MARGIN
  }
  const ensure = (height: number) => {
    if (y - height < MARGIN + 12) newPage()
  }
  const draw = (
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    options?: { color?: ReturnType<typeof rgb> },
  ) => {
    if (!text) return
    page.drawText(text, { x, y, size, font, color: options?.color ?? INK })
  }
  const drawCentered = (text: string, size: number, font: PDFFont, leading = 16, spaced = 0) => {
    const lines = wrapLines(text, size, font, CONTENT_W, CONTENT_W, 0)
    for (const line of lines) {
      ensure(leading + spaced)
      const width = font.widthOfTextAtSize(line.text, size)
      page.drawText(line.text, { x: MARGIN + (CONTENT_W - width) / 2, y, size, font, color: INK })
      y -= leading + spaced
    }
  }
  const drawWrapped = (
    text: string,
    opts: {
      font: PDFFont
      size: number
      leading: number
      leftIndent?: number
      rightIndent?: number
      firstIndent?: number
    },
  ) => {
    const leftIndent = opts.leftIndent ?? 0
    const rightIndent = opts.rightIndent ?? 0
    const firstIndent = opts.firstIndent ?? 0
    const firstWidth = CONTENT_W - leftIndent - rightIndent - firstIndent
    const restWidth = CONTENT_W - leftIndent - rightIndent
    const lines = wrapLines(text, opts.size, opts.font, firstWidth, restWidth, firstIndent)
    for (const line of lines) {
      ensure(opts.leading)
      page.drawText(line.text, {
        x: MARGIN + leftIndent + line.indent,
        y,
        size: opts.size,
        font: opts.font,
        color: INK,
      })
      y -= opts.leading
    }
  }

  const drawRule = (width = 260) => {
    ensure(18)
    page.drawLine({
      start: { x: MARGIN + (CONTENT_W - width) / 2, y: y + 4 },
      end: { x: MARGIN + (CONTENT_W + width) / 2, y: y + 4 },
      thickness: 0.75,
      color: INK,
    })
    y -= 18
  }

  const drawCaption = () => {
    drawCentered(model.court.toUpperCase(), FONT_SIZE, bold, 18)
    if (model.docket) drawCentered(`Docket No. ${model.docket}`, FONT_SIZE, regular, 18)
    y -= 6
    if (model.parties.length) {
      const [first, second] = model.parties
      ensure(40)
      const nameFont = regular
      page.drawText(first.name, { x: MARGIN, y, size: FONT_SIZE, font: nameFont, color: INK })
      if (first.designation) {
        const w = regular.widthOfTextAtSize(first.designation, FONT_SIZE)
        page.drawText(first.designation, { x: MARGIN + CONTENT_W - w, y, size: FONT_SIZE, font: regular, color: INK })
      }
      y -= 20
      const vWidth = regular.widthOfTextAtSize('v.', FONT_SIZE)
      page.drawText('v.', { x: MARGIN + (CONTENT_W - vWidth) / 2, y, size: FONT_SIZE, font: regular, color: INK })
      y -= 20
      if (second) {
        page.drawText(second.name, { x: MARGIN, y, size: FONT_SIZE, font: regular, color: INK })
        if (second.designation) {
          const w = regular.widthOfTextAtSize(second.designation, FONT_SIZE)
          page.drawText(second.designation, {
            x: MARGIN + CONTENT_W - w,
            y,
            size: FONT_SIZE,
            font: regular,
            color: INK,
          })
        }
        y -= 20
      }
    } else if (model.captionLine) {
      drawCentered(model.captionLine.toUpperCase(), FONT_SIZE, regular, 18)
    }
    drawRule()
    drawCentered(model.title, FONT_SIZE, bold, 18)
    y -= 10
  }

  const drawToc = (rows: { text: string; level: number; blockId: string }[]) => {
    drawCentered('TABLE OF CONTENTS', FONT_SIZE, bold, 20)
    y -= 6
    if (!rows.length) {
      drawWrapped('No headings found. Add headings to build the table of contents.', {
        font: italic,
        size: FONT_SIZE,
        leading: 18,
      })
      return
    }
    for (const row of rows) {
      ensure(18)
      const indent = (Math.min(3, row.level) - 1) * 18
      const size = FONT_SIZE
      const textWidth = Math.min(
        regular.widthOfTextAtSize(row.text, size),
        CONTENT_W - indent - 46,
      )
      page.drawText(row.text, {
        x: MARGIN + indent,
        y,
        size,
        font: row.level === 1 ? regular : regular,
        color: INK,
        maxWidth: CONTENT_W - indent - 46,
      })
      const pageNumber = prior?.headingPages.get(row.blockId)
      const label = pageNumber ? String(pageNumber) : ''
      if (label) {
        const w = regular.widthOfTextAtSize(label, size)
        page.drawText(label, { x: MARGIN + CONTENT_W - w, y, size, font: regular, color: INK })
      }
      const leaderStart = MARGIN + indent + textWidth + 6
      const leaderEnd = MARGIN + CONTENT_W - (label ? 22 : 0)
      if (leaderEnd > leaderStart) {
        page.drawLine({
          start: { x: leaderStart, y: y + 3 },
          end: { x: leaderEnd, y: y + 3 },
          thickness: 0.4,
          color: GREY,
          dashArray: [0.5, 3],
        })
      }
      y -= 20
    }
  }

  const drawToa = (rows: { authorityId: string; name: string; reporter: string; pinpoints: string[] }[]) => {
    drawCentered('TABLE OF AUTHORITIES', FONT_SIZE, bold, 20)
    y -= 4
    page.drawText('Cases', { x: MARGIN, y, size: FONT_SIZE, font: italic, color: INK })
    y -= 22
    if (!rows.length) {
      drawWrapped('No authorities are cited in this document yet.', {
        font: italic,
        size: FONT_SIZE,
        leading: 18,
      })
      return
    }
    for (const row of rows) {
      ensure(38)
      const pages = Array.from(new Set(prior?.authorityPages.get(row.authorityId) ?? [])).sort((a, b) => a - b)
      const label = pages.length === 0 ? '' : pages.length > 3 ? 'passim' : pages.join(', ')
      const nameLines = wrapLines(row.name, FONT_SIZE, regular, CONTENT_W - 60, CONTENT_W - 60, 0)
      for (const line of nameLines) {
        ensure(18)
        page.drawText(line.text, { x: MARGIN, y, size: FONT_SIZE, font: boldItalic, color: INK })
        y -= 18
      }
      const detail = `${row.reporter}${row.pinpoints.length ? `, ${row.pinpoints.join(', ')}` : ''}`
      ensure(18)
      page.drawText(detail, { x: MARGIN + 24, y, size: FONT_SIZE, font: regular, color: INK, maxWidth: CONTENT_W - 100 })
      if (label) {
        const w = regular.widthOfTextAtSize(label, FONT_SIZE)
        page.drawText(label, { x: MARGIN + CONTENT_W - w, y, size: FONT_SIZE, font: regular, color: INK })
      }
      y -= 18
      y -= 6
    }
  }

  const drawExhibitIndex = (rows: { number: number; title: string; pages: number; bates: string }[]) => {
    drawCentered('EXHIBIT INDEX', FONT_SIZE, bold, 20)
    y -= 4
    const cols = [
      { x: MARGIN, w: 48 },
      { x: MARGIN + 54, w: CONTENT_W - 54 - 58 - 150 },
      { x: MARGIN + CONTENT_W - 208, w: 50 },
      { x: MARGIN + CONTENT_W - 150, w: 150 },
    ]
    ensure(18)
    page.drawText('Ex.', { x: cols[0].x, y, size: 11, font: bold, color: INK })
    page.drawText('Description', { x: cols[1].x, y, size: 11, font: bold, color: INK })
    page.drawText('Pages', { x: cols[2].x, y, size: 11, font: bold, color: INK })
    page.drawText('Bates range', { x: cols[3].x, y, size: 11, font: bold, color: INK })
    y -= 6
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_W, y },
      thickness: 0.75,
      color: INK,
    })
    y -= 20
    if (!rows.length) {
      drawWrapped('No exhibits are listed for this case.', { font: italic, size: FONT_SIZE, leading: 18 })
      return
    }
    for (const row of rows) {
      const descLines = wrapLines(row.title, 11, regular, cols[1].w, cols[1].w, 0)
      const height = Math.max(18, descLines.length * 16)
      ensure(height + 6)
      page.drawText(String(row.number), { x: cols[0].x, y, size: 11, font: regular, color: INK })
      descLines.forEach((line, i) => {
        page.drawText(line.text, { x: cols[1].x, y: y - i * 16, size: 11, font: regular, color: INK })
      })
      page.drawText(String(row.pages || '—'), { x: cols[2].x, y, size: 11, font: regular, color: INK })
      page.drawText(row.bates || '—', { x: cols[3].x, y, size: 11, font: regular, color: INK })
      y -= height + 8
    }
  }

  const drawCertificate = (element: Extract<ExportModel['elements'][number], { kind: 'certificate' }>) => {
    drawCentered('CERTIFICATE OF SERVICE', FONT_SIZE, bold, 20)
    y -= 6
    const recipients = element.recipients.length
      ? element.recipients.map(r => `${r.name}${r.address ? `, ${r.address}` : ''}${r.email ? ` (${r.email})` : ''}`)
      : []
    drawWrapped(
      `I certify that on ${element.date}, a copy of this document was served on the following persons through eFile & Serve:`,
      { font: regular, size: FONT_SIZE, leading: DOUBLE },
    )
    y -= 6
    if (!recipients.length) {
      drawWrapped('No service contacts are marked for this case. Add service contacts in People before serving.', {
        font: italic,
        size: FONT_SIZE,
        leading: DOUBLE,
      })
    } else {
      for (const recipient of recipients) {
        drawWrapped(recipient, { font: regular, size: 11, leading: 16, leftIndent: 24 })
        y -= 4
      }
    }
    y -= 18
    drawWrapped(`Dated: ${element.date}`, { font: regular, size: FONT_SIZE, leading: DOUBLE })
    y -= 24
    drawWrapped('Respectfully submitted,', { font: regular, size: FONT_SIZE, leading: DOUBLE })
    y -= 18
    drawWrapped(element.signer, { font: bold, size: FONT_SIZE, leading: DOUBLE })
    if (element.role) {
      drawWrapped(`Counsel for ${element.role}`, { font: regular, size: FONT_SIZE, leading: DOUBLE })
    }
  }

  for (let index = 0; index < model.elements.length; index++) {
    const element = model.elements[index]
    const block: DocBlock | undefined = doc.blocks[index]
    const startPage = pageNo
    switch (element.kind) {
      case 'caption':
        drawCaption()
        break
      case 'heading': {
        if (!element.text.trim()) break
        if (y < PAGE_H - MARGIN) y -= 10
        ensure(40)
        if (block) map.headingPages.set(block.id, pageNo)
        const font = element.level === 1 ? bold : element.level === 2 ? bold : italic
        if (element.level === 1) {
          drawCentered(element.text, FONT_SIZE, font, 20)
        } else {
          drawWrapped(element.text, {
            font,
            size: FONT_SIZE,
            leading: 20,
            leftIndent: element.level === 3 ? 24 : 0,
          })
        }
        y -= 4
        break
      }
      case 'paragraph':
        drawWrapped(element.text, {
          font: regular,
          size: FONT_SIZE,
          leading: DOUBLE,
          firstIndent: 36,
        })
        break
      case 'quote':
        y -= 6
        drawWrapped(element.text, {
          font: regular,
          size: FONT_SIZE,
          leading: 18,
          leftIndent: 36,
          rightIndent: 36,
        })
        y -= 6
        break
      case 'pagebreak':
        newPage()
        break
      case 'toc':
        drawToc(element.rows)
        break
      case 'toa':
        drawToa(element.rows)
        break
      case 'exhibitIndex':
        drawExhibitIndex(element.rows)
        break
      case 'certificate':
        drawCertificate(element)
        break
    }
    if (block) {
      for (const token of findTokens(block.text)) {
        if (token.kind !== 'cite') continue
        const citation = data.citations.find(c => c.id === token.id)
        if (!citation) continue
        const pages = map.authorityPages.get(citation.authorityId) ?? []
        const range: number[] = []
        for (let p = startPage; p <= pageNo; p++) range.push(p)
        map.authorityPages.set(
          citation.authorityId,
          Array.from(new Set([...pages, ...range])).sort((a, b) => a - b),
        )
      }
    }
  }

  const total = pdf.getPageCount()
  pdf.getPages().forEach((p, i) => {
    const label = `Page ${i + 1} of ${total}`
    const width = regular.widthOfTextAtSize(label, 10)
    p.drawText(label, {
      x: (PAGE_W - width) / 2,
      y: 36,
      size: 10,
      font: regular,
      color: GREY,
    })
  })

  return { bytes: await pdf.save(), map }
}

export async function buildDocumentPdf(
  data: AppData,
  matterCase: MatterCase,
  doc: MatterDoc,
  filing?: Filing,
): Promise<Uint8Array> {
  const model = buildExportModel(data, matterCase, doc, filing)
  const first = await renderPdf(data, doc, model)
  const second = await renderPdf(data, doc, model, first.map)
  return second.bytes
}

function generatedDoc(caseId: string, title: string, blocks: DocBlock[]): MatterDoc {
  const now = new Date().toISOString()
  return {
    id: uid('doc'),
    caseId,
    title,
    kind: 'Other',
    templateId: 'generated',
    blocks,
    versions: [],
    status: 'Final',
    createdAt: now,
    updatedAt: now,
  }
}

export async function buildCertificatePdf(
  data: AppData,
  matterCase: MatterCase,
  filing?: Filing,
): Promise<Uint8Array> {
  const doc = generatedDoc(matterCase.id, 'Certificate of Service', [
    { id: uid('blk'), type: 'caption', text: '' },
    { id: uid('blk'), type: 'certificateOfService', text: '' },
  ])
  return buildDocumentPdf(data, matterCase, doc, filing)
}

export async function buildExhibitIndexPdf(data: AppData, matterCase: MatterCase): Promise<Uint8Array> {
  const doc = generatedDoc(matterCase.id, 'Exhibit Index', [
    { id: uid('blk'), type: 'caption', text: '' },
    { id: uid('blk'), type: 'exhibitIndex', text: '' },
  ])
  return buildDocumentPdf(data, matterCase, doc)
}
