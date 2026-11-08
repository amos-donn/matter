import type { AppData, CaseContact, Contact, MatterDoc, Filing, Citation } from '../core/types'

export const fullAddress = (c: Contact) =>
  [c.address1, c.address2, [c.city, c.state, c.zip].filter(Boolean).join(', ')].filter(Boolean).join(', ')

export const caseLinks = (data: AppData, caseId: string): { link: CaseContact; contact: Contact }[] =>
  data.caseContacts
    .filter(l => l.caseId === caseId && l.active)
    .map(link => ({ link, contact: data.contacts.find(c => c.id === link.contactId)! }))
    .filter(x => Boolean(x.contact))

export const caseDocs = (data: AppData, caseId: string): MatterDoc[] =>
  data.documents
    .filter(d => d.caseId === caseId && !d.deletedAt)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

export const filingDoc = (data: AppData, filing: Filing) =>
  data.documents.find(d => d.id === filing.documentId)

export const caseCitations = (data: AppData, caseId: string): Citation[] =>
  data.citations.filter(c => c.caseId === caseId)

export const authorityOf = (data: AppData, citation: Citation) =>
  data.authorities.find(a => a.id === citation.authorityId)

export const caseTitle = (data: AppData, caseId?: string) =>
  data.cases.find(c => c.id === caseId)?.caption || ''
