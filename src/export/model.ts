import type { AppData, MatterCase, MatterDoc, Filing, Contact } from '../core/types'
import { COUNTERPART_ROLE } from '../core/constants'
import { headingEntries, renderText, tableOfAuthorities } from '../core/citations'
import { serviceContactsFor, selectedContactDetails } from '../core/preflight'
import { formatDate, todayIso } from '../core/util'

export interface ExportParty {
  name: string
  designation: string
}

export interface CertificateRecipient {
  name: string
  address: string
  email: string
}

export type ExportElement =
  | { kind: 'caption' }
  | { kind: 'heading'; text: string; level: 1 | 2 | 3 }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'pagebreak' }
  | { kind: 'toc'; rows: { text: string; level: number; blockId: string }[] }
  | {
      kind: 'toa'
      rows: { authorityId: string; name: string; reporter: string; pinpoints: string[] }[]
    }
  | {
      kind: 'exhibitIndex'
      rows: { number: number; title: string; pages: number; bates: string }[]
    }
  | {
      kind: 'certificate'
      date: string
      recipients: CertificateRecipient[]
      signer: string
      role: string
    }

export interface ExportModel {
  court: string
  docket: string
  captionLine?: string
  parties: ExportParty[]
  title: string
  elements: ExportElement[]
}

function partyDesignation(matterCase: MatterCase) {
  return {
    first: matterCase.role && matterCase.role !== 'Other' ? matterCase.role : '',
    second: COUNTERPART_ROLE[matterCase.role] || '',
  }
}

function formatContactAddress(c: Contact): string {
  return [c.address1, c.address2, [c.city, c.state, c.zip].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ')
}

export function buildExportModel(
  data: AppData,
  matterCase: MatterCase,
  doc: MatterDoc,
  filing?: Filing,
): ExportModel {
  const parties: ExportParty[] = []
  const designation = partyDesignation(matterCase)
  const captionText = matterCase.caption.trim()
  const match = captionText.match(/^(.*?)\s+v\.?\s+(.*)$/i)
  if (match) {
    parties.push({ name: match[1].trim().toUpperCase(), designation: designation.first })
    parties.push({ name: match[2].trim().toUpperCase(), designation: designation.second })
  }

  const recipientSource: { name: string; address: string; email: string }[] = []
  if (filing) {
    for (const { contact } of selectedContactDetails(data, filing)) {
      recipientSource.push({
        name: contact.name,
        address: formatContactAddress(contact),
        email: contact.email,
      })
    }
  } else {
    for (const { contact } of serviceContactsFor(data, matterCase.id)) {
      recipientSource.push({
        name: contact.name,
        address: formatContactAddress(contact),
        email: contact.email,
      })
    }
  }

  const authorities = tableOfAuthorities(data, doc)
  const exhibitRows = data.exhibits
    .filter(e => !e.deletedAt && e.caseId === matterCase.id)
    .sort((a, b) => a.number - b.number)
    .map(e => ({
      number: e.number,
      title: e.title || e.fileName || 'Exhibit',
      pages: e.pages,
      bates: e.bates ? `${e.bates.prefix}${String(e.bates.start).padStart(6, '0')}–${String(e.bates.end).padStart(6, '0')}` : '',
    }))

  const elements: ExportElement[] = []
  for (const block of doc.blocks) {
    switch (block.type) {
      case 'caption':
        elements.push({ kind: 'caption' })
        break
      case 'heading':
        elements.push({ kind: 'heading', text: renderText(data, block.text), level: block.level || 1 })
        break
      case 'paragraph':
        elements.push({ kind: 'paragraph', text: renderText(data, block.text) })
        break
      case 'quote':
        elements.push({ kind: 'quote', text: renderText(data, block.text) })
        break
      case 'pagebreak':
        elements.push({ kind: 'pagebreak' })
        break
      case 'tableOfContents':
        elements.push({
          kind: 'toc',
          rows: headingEntries(doc).map(h => ({
            text: renderText(data, h.text),
            level: h.block.level || 1,
            blockId: h.block.id,
          })),
        })
        break
      case 'tableOfAuthorities':
        elements.push({
          kind: 'toa',
          rows: authorities.map(row => ({
            authorityId: row.authority.id,
            name: row.authority.caseName,
            reporter: `${row.authority.reporter} (${row.authority.year})`,
            pinpoints: row.pinpoints,
          })),
        })
        break
      case 'exhibitIndex':
        elements.push({ kind: 'exhibitIndex', rows: exhibitRows })
        break
      case 'certificateOfService':
        elements.push({
          kind: 'certificate',
          date: formatDate(todayIso()),
          recipients: recipientSource,
          signer: data.user,
          role: matterCase.role,
        })
        break
    }
  }

  return {
    court: matterCase.court,
    docket: matterCase.number,
    captionLine: match ? undefined : captionText,
    parties,
    title: doc.title.trim().toUpperCase(),
    elements,
  }
}
