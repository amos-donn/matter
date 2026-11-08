import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx'
import type { AppData, MatterCase, MatterDoc, Filing } from '../core/types'
import { buildExportModel } from './model'

const FONT = 'Times New Roman'
const SIZE = 24 // half-points, 12pt

const bodyRun = (text: string, opts?: { bold?: boolean; italics?: boolean }) =>
  new TextRun({ text, font: FONT, size: SIZE, bold: opts?.bold, italics: opts?.italics })

const captionParagraphs = (model: ReturnType<typeof buildExportModel>): Paragraph[] => {
  const out: Paragraph[] = []
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [bodyRun(model.court.toUpperCase(), { bold: true })],
    }),
  )
  if (model.docket) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [bodyRun(`Docket No. ${model.docket}`)],
      }),
    )
  }
  if (model.parties.length) {
    const [first, second] = model.parties
    out.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [bodyRun(first.name), bodyRun(`\t${first.designation || ''}`)],
      }),
    )
    out.push(new Paragraph({ children: [bodyRun('')] }))
    out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [bodyRun('v.')] }))
    out.push(new Paragraph({ children: [bodyRun('')] }))
    out.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        children: [bodyRun(second.name), bodyRun(`\t${second.designation || ''}`)],
      }),
    )
  } else if (model.captionLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [bodyRun(model.captionLine.toUpperCase())],
      }),
    )
  }
  out.push(
    new Paragraph({
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
      children: [bodyRun('')],
    }),
  )
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [bodyRun(model.title, { bold: true })],
    }),
  )
  return out
}

export async function buildDocumentDocx(
  data: AppData,
  matterCase: MatterCase,
  doc: MatterDoc,
  filing?: Filing,
): Promise<Uint8Array> {
  const model = buildExportModel(data, matterCase, doc, filing)
  const children: (Paragraph | Table | TableOfContents)[] = []

  for (const element of model.elements) {
    switch (element.kind) {
      case 'caption':
        children.push(...captionParagraphs(model))
        break
      case 'heading': {
        if (!element.text.trim()) break
        children.push(
          new Paragraph({
            alignment: element.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
            outlineLevel: Math.min(2, element.level - 1),
            spacing: { before: 240, after: 120, line: 360 },
            indent: element.level === 3 ? { left: 360 } : undefined,
            children: [
              bodyRun(element.text, { bold: element.level < 3, italics: element.level === 3 }),
            ],
          }),
        )
        break
      }
      case 'paragraph':
        children.push(
          new Paragraph({
            spacing: { line: 480 },
            indent: { firstLine: 720 },
            children: [bodyRun(element.text)],
          }),
        )
        break
      case 'quote':
        children.push(
          new Paragraph({
            spacing: { line: 240, before: 120, after: 120 },
            indent: { left: 720, right: 720 },
            children: [bodyRun(element.text)],
          }),
        )
        break
      case 'pagebreak':
        children.push(new Paragraph({ children: [new PageBreak()] }))
        break
      case 'toc':
        children.push(
          new TableOfContents('TABLE OF CONTENTS', {
            hyperlink: true,
            headingStyleRange: '1-3',
          }),
        )
        break
      case 'toa': {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [bodyRun('TABLE OF AUTHORITIES', { bold: true })],
          }),
          new Paragraph({ children: [bodyRun('Cases', { italics: true })] }),
        )
        if (!element.rows.length) {
          children.push(
            new Paragraph({ children: [bodyRun('No authorities are cited in this document yet.')] }),
          )
        }
        for (const row of element.rows) {
          children.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
              spacing: { before: 120, line: 240 },
              children: [bodyRun(row.name, { italics: true }), bodyRun('\tpassim')],
            }),
            new Paragraph({
              spacing: { line: 240 },
              indent: { left: 360 },
              children: [
                bodyRun(
                  `${row.reporter}${row.pinpoints.length ? `, ${row.pinpoints.join(', ')}` : ''}`,
                ),
              ],
            }),
          )
        }
        break
      }
      case 'exhibitIndex': {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [bodyRun('EXHIBIT INDEX', { bold: true })],
          }),
        )
        const header = new TableRow({
          children: ['Ex.', 'Description', 'Pages', 'Bates range'].map(
            text =>
              new TableCell({
                children: [new Paragraph({ children: [bodyRun(text, { bold: true })] })],
              }),
          ),
        })
        const rows = element.rows.map(
          row =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [bodyRun(String(row.number))] })],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [bodyRun(row.title)] })],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [bodyRun(String(row.pages || '—'))] })],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [bodyRun(row.bates || '—')] })],
                }),
              ],
            }),
        )
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [header, ...rows],
          }),
        )
        break
      }
      case 'certificate': {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 },
            children: [bodyRun('CERTIFICATE OF SERVICE', { bold: true })],
          }),
          new Paragraph({
            spacing: { line: 480 },
            indent: { firstLine: 720 },
            children: [
              bodyRun(
                `I certify that on ${element.date}, a copy of this document was served on the following persons through eFile & Serve:`,
              ),
            ],
          }),
        )
        if (!element.recipients.length) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                bodyRun('No service contacts are marked for this case. Add service contacts in People before serving.', {
                  italics: true,
                }),
              ],
            }),
          )
        }
        for (const recipient of element.recipients) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              spacing: { line: 240 },
              children: [bodyRun(recipient.name)],
            }),
            new Paragraph({
              indent: { left: 360 },
              spacing: { line: 240, after: 120 },
              children: [
                bodyRun(
                  [recipient.address, recipient.email].filter(Boolean).join(' · ') || 'No address on file',
                ),
              ],
            }),
          )
        }
        children.push(
          new Paragraph({ spacing: { before: 360 }, children: [bodyRun(`Dated: ${element.date}`)] }),
          new Paragraph({ spacing: { before: 240 }, children: [bodyRun('Respectfully submitted,')] }),
          new Paragraph({ spacing: { before: 360 }, children: [bodyRun(element.signer, { bold: true })] }),
          new Paragraph({ children: [bodyRun(element.role ? `Counsel for ${element.role}` : '')] }),
        )
        break
      }
    }
  }

  const document = new Document({
    creator: data.user,
    title: doc.title,
    description: 'Prepared in Legal Matter Workspace',
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(document)
  return new Uint8Array(await blob.arrayBuffer())
}
