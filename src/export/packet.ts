import { zipSync } from 'fflate'
import type { AppData, MatterCase, MatterDoc, Filing, StagedFile } from '../core/types'
import { buildCertificatePdf, buildDocumentPdf, buildExhibitIndexPdf } from './pdf'
import { flattenPdfForms } from '../pdf/ops'
import { runPreflight, selectedContactDetails, preflightSummary } from '../core/preflight'
import { formatDate, safeFilename, todayIso } from '../core/util'
import type { PreflightResult } from '../core/preflight'

export interface PacketBuild {
  zip: Uint8Array
  files: StagedFile[]
  checklist: string
  preflight: PreflightResult
  flattenedExhibits: { exhibitId: string; bytes: Uint8Array }[]
}

function slug(text: string): string {
  return safeFilename(text, 'filing').replace(/\s+/g, '-')
}

function checklistText(
  data: AppData,
  matterCase: MatterCase,
  filing: Filing,
  doc: MatterDoc,
  preflight: PreflightResult,
  exhibitNames: string[],
): string {
  const lines: string[] = []
  lines.push('FILING CHECKLIST')
  lines.push(''.padEnd(64, '='))
  lines.push(`Case: ${matterCase.caption}`)
  lines.push(`Court: ${matterCase.court}`)
  lines.push(`Case number: ${matterCase.number}`)
  lines.push(`Document: ${doc.title}`)
  lines.push(`Filing type: ${filing.type}`)
  lines.push(`Filing code: ${filing.filingCode || '—'}`)
  lines.push(`Fees: ${filing.fees || '—'}`)
  lines.push(`Payment account: ${filing.paymentAccount || '—'}`)
  lines.push(`Filing attorney: ${filing.filingAttorney || '—'}`)
  lines.push(`Additional attorneys: ${filing.additionalAttorneys || '—'}`)
  lines.push(`Under seal: ${filing.underSeal ? 'Yes' : 'No'}`)
  lines.push(`Limited appearance: ${filing.limitedAppearance ? 'Yes' : 'No'}`)
  lines.push('')
  lines.push('Service contacts')
  const recipients = selectedContactDetails(data, filing)
  if (!recipients.length) lines.push('  None selected')
  for (const { contact } of recipients) {
    const address = [contact.address1, [contact.city, contact.state, contact.zip].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(', ')
    lines.push(`  - ${contact.name}${address ? ` — ${address}` : ' — NO ADDRESS'}`)
  }
  lines.push('')
  lines.push('Packet contents')
  for (const name of exhibitNames) lines.push(`  - ${name}`)
  lines.push('')
  lines.push('Preflight')
  lines.push(`  ${preflightSummary(preflight)}`)
  for (const check of preflight.checks) {
    lines.push(`  [${check.state}] ${check.label}: ${check.detail}`)
  }
  lines.push('')
  lines.push(`Prepared ${formatDate(todayIso())} in Legal Matter Workspace.`)
  lines.push('Preflight does not submit anything. Open eFile & Serve to submit, then')
  lines.push('record the envelope number and status in the app.')
  return lines.join('\n')
}

export async function buildPacket(
  data: AppData,
  matterCase: MatterCase,
  filing: Filing,
  doc: MatterDoc,
  exhibitBytes: Map<string, Uint8Array>,
): Promise<PacketBuild> {
  const exhibits = data.exhibits
    .filter(e => !e.deletedAt && filing.exhibitIds.includes(e.id))
    .sort((a, b) => a.number - b.number)

  const docPdf = await buildDocumentPdf(data, matterCase, doc, filing)
  const certificate = await buildCertificatePdf(data, matterCase, filing)
  const indexPdf = await buildExhibitIndexPdf(data, matterCase)
  const preflight = runPreflight(data, filing, matterCase, doc)

  const files: { name: string; bytes: Uint8Array; kind: StagedFile['kind'] }[] = []
  const base = slug(`${matterCase.number}-${doc.title}`)
  files.push({ name: `01-${base}.pdf`, bytes: docPdf, kind: 'Document' })
  const flattened: { exhibitId: string; bytes: Uint8Array }[] = []
  let n = 2
  for (const exhibit of exhibits) {
    const original = exhibitBytes.get(exhibit.id)
    if (!original) continue
    const flattenedBytes = await flattenPdfForms(original)
    if (flattenedBytes !== original) flattened.push({ exhibitId: exhibit.id, bytes: flattenedBytes })
    const name = `${String(n).padStart(2, '0')}-Exhibit-${exhibit.number}-${slug(exhibit.title || 'Exhibit')}.pdf`
    files.push({ name, bytes: flattenedBytes, kind: 'Exhibit' })
    n++
  }
  files.push({
    name: `${String(n++).padStart(2, '0')}-Exhibit-Index.pdf`,
    bytes: indexPdf,
    kind: 'Index',
  })
  files.push({
    name: `${String(n++).padStart(2, '0')}-Certificate-of-Service.pdf`,
    bytes: certificate,
    kind: 'Certificate',
  })

  const checklist = checklistText(
    data,
    matterCase,
    filing,
    doc,
    preflight,
    files.map(f => f.name),
  )
  const checklistBytes = new TextEncoder().encode(checklist)
  files.push({
    name: `${String(n).padStart(2, '0')}-Filing-Checklist.txt`,
    bytes: checklistBytes,
    kind: 'Checklist',
  })

  const zip = zipSync(
    Object.fromEntries(files.map(f => [f.name, f.bytes])),
    { level: 0 },
  )

  return {
    zip,
    files: files.map(f => ({ name: f.name, kind: f.kind, note: `${Math.round(f.bytes.byteLength / 1024)} KB` })),
    checklist,
    preflight,
    flattenedExhibits: flattened,
  }
}
