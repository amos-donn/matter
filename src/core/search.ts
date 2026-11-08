import type { AppData } from './types'
import { renderText } from './citations'
import { excerpt } from './util'

export type SearchKind = 'Document' | 'Note' | 'Authority' | 'Exhibit' | 'Contact' | 'Filing' | 'Case'

export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  subtitle: string
  snippet: string
  caseId?: string
  caseCaption?: string
  docId?: string
  route: string
}

export function searchWorkspace(data: AppData, rawQuery: string, caseId?: string): SearchHit[] {
  const query = rawQuery.trim().toLowerCase()
  if (query.length < 2) return []
  const hits: SearchHit[] = []
  const liveCases = data.cases.filter(c => !c.deletedAt && (!caseId || c.id === caseId))
  const caseMap = new Map(liveCases.map(c => [c.id, c]))
  const caseSuffix = (id?: string) => (id && caseMap.get(id) ? caseMap.get(id)!.caption : '')

  const push = (hit: SearchHit) => {
    if (hits.length < 60) hits.push(hit)
  }

  for (const c of liveCases) {
    if (c.caption.toLowerCase().includes(query) || c.number.toLowerCase().includes(query)) {
      push({
        kind: 'Case',
        id: c.id,
        title: c.caption,
        subtitle: `${c.court} · No. ${c.number}`,
        snippet: '',
        caseId: c.id,
        route: `#/case/${c.id}/overview`,
      })
    }
  }

  for (const doc of data.documents) {
    if (doc.deletedAt || !caseMap.has(doc.caseId)) continue
    const body = doc.blocks.map(b => renderText(data, b.text)).join('\n')
    if (doc.title.toLowerCase().includes(query) || body.toLowerCase().includes(query)) {
      push({
        kind: 'Document',
        id: doc.id,
        title: doc.title,
        subtitle: `${caseSuffix(doc.caseId)} · ${doc.kind}`,
        snippet: excerpt(body, query),
        caseId: doc.caseId,
        docId: doc.id,
        route: `#/case/${doc.caseId}/documents/${doc.id}`,
      })
    }
  }

  for (const note of data.notes) {
    if (note.deletedAt || !caseMap.has(note.caseId)) continue
    if (note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query)) {
      push({
        kind: 'Note',
        id: note.id,
        title: note.title,
        subtitle: caseSuffix(note.caseId),
        snippet: excerpt(note.body, query),
        caseId: note.caseId,
        route: `#/case/${note.caseId}/notes`,
      })
    }
  }

  for (const auth of data.authorities) {
    if (
      auth.caseName.toLowerCase().includes(query) ||
      auth.reporter.toLowerCase().includes(query) ||
      auth.summary.toLowerCase().includes(query)
    ) {
      push({
        kind: 'Authority',
        id: auth.id,
        title: auth.caseName,
        subtitle: `${auth.reporter} (${auth.year}) · ${auth.court}`,
        snippet: excerpt(auth.summary, query),
        route: '#/library',
      })
    }
  }

  for (const exhibit of data.exhibits) {
    if (exhibit.deletedAt || !caseMap.has(exhibit.caseId)) continue
    if (
      exhibit.title.toLowerCase().includes(query) ||
      exhibit.description.toLowerCase().includes(query) ||
      (exhibit.fileName || '').toLowerCase().includes(query)
    ) {
      push({
        kind: 'Exhibit',
        id: exhibit.id,
        title: `Exhibit ${exhibit.number}: ${exhibit.title}`,
        subtitle: caseSuffix(exhibit.caseId),
        snippet: excerpt(exhibit.description || exhibit.fileName || '', query),
        caseId: exhibit.caseId,
        route: `#/case/${exhibit.caseId}/exhibits`,
      })
    }
  }

  for (const link of data.caseContacts) {
    if (!link.active || !caseMap.has(link.caseId)) continue
    const contact = data.contacts.find(c => c.id === link.contactId)
    if (!contact) continue
    if (
      contact.name.toLowerCase().includes(query) ||
      contact.organization.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    ) {
      push({
        kind: 'Contact',
        id: contact.id,
        title: contact.name,
        subtitle: `${caseSuffix(link.caseId)} · ${link.roles.join(', ') || 'Service contact'}`,
        snippet: [contact.organization, contact.email, contact.phone].filter(Boolean).join(' · '),
        caseId: link.caseId,
        route: `#/case/${link.caseId}/people`,
      })
    }
  }

  for (const filing of data.filings) {
    if (!caseMap.has(filing.caseId)) continue
    if (
      filing.envelopeNumber.toLowerCase().includes(query) ||
      filing.filingCode.toLowerCase().includes(query) ||
      filing.status.toLowerCase().includes(query)
    ) {
      push({
        kind: 'Filing',
        id: filing.id,
        title: `Filing · ${filing.status}`,
        subtitle: `${caseSuffix(filing.caseId)} · ${filing.filingCode || 'No code'}`,
        snippet: filing.envelopeNumber ? `Envelope ${filing.envelopeNumber}` : '',
        caseId: filing.caseId,
        route: `#/case/${filing.caseId}/filings`,
      })
    }
  }

  return hits
}
