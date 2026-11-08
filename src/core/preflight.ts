import type { AppData, Filing, MatterCase, MatterDoc, PreflightOverride, CaseContact, Contact } from './types'
import { scanDocument } from './citations'
import { deadlineDate, caseDeadlines } from './deadlines'
import { daysFromToday } from './util'

export type CheckState = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Overridden'

export interface PreflightCheck {
  id: string
  label: string
  group: 'Filing details' | 'Service' | 'Documents' | 'Citations' | 'Exhibits'
  state: CheckState
  detail: string
  action?: { label: string; section: string; docId?: string }
  overridable: boolean
  override?: PreflightOverride
}

export interface PreflightResult {
  checks: PreflightCheck[]
  passed: number
  failed: number
  overridden: number
  total: number
  ok: boolean
}

function fmtAddress(c: Contact): string {
  return [c.address1, c.city, c.state, c.zip].filter(Boolean).join(', ')
}

export function serviceContactsFor(data: AppData, caseId: string): { link: CaseContact; contact: Contact }[] {
  return data.caseContacts
    .filter(l => l.caseId === caseId && l.active && l.service)
    .map(link => ({ link, contact: data.contacts.find(c => c.id === link.contactId)! }))
    .filter(x => x.contact)
}

export function selectedContactDetails(data: AppData, filing: Filing): { link: CaseContact; contact: Contact }[] {
  return filing.serviceContactIds
    .map(id => {
      const link = data.caseContacts.find(l => l.id === id)
      const contact = link ? data.contacts.find(c => c.id === link.contactId) : undefined
      return link && contact ? { link, contact } : undefined
    })
    .filter((x): x is { link: CaseContact; contact: Contact } => Boolean(x))
}

export function runPreflight(
  data: AppData,
  filing: Filing,
  matterCase: MatterCase,
  doc: MatterDoc | undefined,
): PreflightResult {
  const checks: PreflightCheck[] = []
  const overrideFor = (id: string) => filing.preflightOverrides.find(o => o.checkId === id)
  const add = (check: PreflightCheck) => {
    checks.push(check)
  }
  const serves = filing.type !== 'eFile Only'

  // 1. Filing code ---------------------------------------------------------
  add({
    id: 'filing-code',
    label: 'Filing code',
    group: 'Filing details',
    state: filing.filingCode.trim() ? 'Passed' : 'Failed',
    detail: filing.filingCode.trim()
      ? filing.filingCode
      : 'Choose the filing code shown in eFile & Serve.',
    action: { label: 'Edit filing', section: 'filings' },
    overridable: false,
  })

  // 2. Filing attorney -----------------------------------------------------
  add({
    id: 'filing-attorney',
    label: 'Filing attorney',
    group: 'Filing details',
    state: filing.filingAttorney.trim() ? 'Passed' : 'Failed',
    detail: filing.filingAttorney.trim()
      ? filing.filingAttorney
      : 'Choose the filing attorney. Odyssey requires one name per filing.',
    action: { label: 'Edit filing', section: 'filings' },
    overridable: false,
  })

  // 3. Payment account -----------------------------------------------------
  const feeValue = Number(String(filing.fees).replace(/[^0-9.]/g, ''))
  const needsPayment = Number.isFinite(feeValue) && feeValue > 0
  add({
    id: 'payment-account',
    label: 'Payment account',
    group: 'Filing details',
    state: !needsPayment || filing.paymentAccount.trim() ? 'Passed' : 'Failed',
    detail: !needsPayment
      ? 'No fee recorded, so a payment account is not required.'
      : filing.paymentAccount.trim()
        ? filing.paymentAccount
        : 'A fee is recorded. Choose the payment account used in eFile & Serve.',
    action: { label: 'Edit filing', section: 'filings' },
    overridable: false,
  })

  // 4. Service contacts ----------------------------------------------------
  const selected = selectedContactDetails(data, filing)
  const allService = serviceContactsFor(data, matterCase.id)
  if (!serves) {
    add({
      id: 'service-contacts',
      label: 'Service contacts',
      group: 'Service',
      state: 'Passed',
      detail: 'Not required for eFile Only.',
      action: { label: 'Service contacts', section: 'people' },
      overridable: false,
    })
    add({
      id: 'service-selection',
      label: 'Selected recipients',
      group: 'Service',
      state: 'Passed',
      detail: 'No service required.',
      action: { label: 'Service contacts', section: 'people' },
      overridable: false,
    })
  } else {
    const omitted = allService.filter(x => !filing.serviceContactIds.includes(x.link.id))
    add({
      id: 'service-contacts',
      label: 'Service contacts',
      group: 'Service',
      state: selected.length ? 'Passed' : 'Failed',
      detail: selected.length
        ? `${selected.length} recipient${selected.length === 1 ? '' : 's'} selected.`
        : 'Select at least one service contact for this filing.',
      action: { label: 'Service contacts', section: 'people' },
      overridable: false,
    })
    add({
      id: 'service-omitted',
      label: 'All service contacts included',
      group: 'Service',
      state: omitted.length ? 'Failed' : 'Passed',
      detail: omitted.length
        ? `${omitted.map(x => x.contact.name).join(', ')} ${omitted.length === 1 ? 'is' : 'are'} marked for service on this case but not included.`
        : 'Every active service contact is included.',
      action: { label: 'Service contacts', section: 'people' },
      overridable: false,
    })
    const missingAddress = selected.filter(x => !fmtAddress(x.contact).trim())
    add({
      id: 'service-address',
      label: 'Service addresses',
      group: 'Service',
      state: missingAddress.length ? 'Failed' : 'Passed',
      detail: missingAddress.length
        ? `No service address for ${missingAddress.map(x => x.contact.name).join(', ')}. Add one in People.`
        : 'Every selected recipient has an address.',
      action: { label: 'Open People', section: 'people' },
      overridable: false,
    })
  }

  // 5. Document ------------------------------------------------------------
  const hasBody = Boolean(doc && doc.blocks.some(b => b.text.trim() || b.type === 'pagebreak'))
  add({
    id: 'document',
    label: 'Document in packet',
    group: 'Documents',
    state: doc && hasBody ? 'Passed' : 'Failed',
    detail: !doc
      ? 'The draft for this filing is missing.'
      : hasBody
        ? doc.title
        : 'The draft has no body text yet.',
    action: { label: 'Open draft', section: 'documents', docId: doc?.id },
    overridable: false,
  })

  // 6. Certificate of service ---------------------------------------------
  const hasCertificate = Boolean(doc?.blocks.some(b => b.type === 'certificateOfService'))
  add({
    id: 'certificate',
    label: 'Certificate of service',
    group: 'Documents',
    state: !serves || hasCertificate ? 'Passed' : 'Failed',
    detail: !serves
      ? 'Not required for eFile Only.'
      : hasCertificate
        ? 'Certificate of service is in the draft.'
        : 'Add a certificate of service block (Insert > Certificate of Service) when serving.',
    action: { label: 'Open draft', section: 'documents', docId: doc?.id },
    overridable: false,
  })

  // 7. Citations -----------------------------------------------------------
  const scan = doc ? scanDocument(data, doc) : undefined
  const citationProblems = scan
    ? scan.findings.filter(f =>
        ['unverified', 'flagged', 'missing-record', 'missing-authority'].includes(f.kind),
      )
    : []
  const citationOverride = overrideFor('citations')
  add({
    id: 'citations',
    label: 'Citation verification',
    group: 'Citations',
    state: citationProblems.length
      ? citationOverride
        ? 'Overridden'
        : 'Failed'
      : 'Passed',
    detail: citationProblems.length
      ? citationOverride
        ? `${citationProblems.length} issue${citationProblems.length === 1 ? '' : 's'} overridden: ${citationOverride.reason}`
        : `This draft cites ${citationProblems.length} authorit${citationProblems.length === 1 ? 'y' : 'ies'} that are not verified. Mark them verified, or override with a reason.`
      : scan
        ? `${scan.citedCount} citation${scan.citedCount === 1 ? '' : 's'} checked; all verified.`
        : 'No document to scan.',
    action: { label: 'Citation Scan', section: 'documents', docId: doc?.id },
    overridable: Boolean(citationProblems.length),
    override: citationOverride,
  })

  // 8. Exhibits ------------------------------------------------------------
  const referenced = doc
    ? Array.from(new Set((doc.blocks.flatMap(b => [...b.text.matchAll(/\{\{ex:([A-Za-z0-9_-]+)/g)])).map(m => m[1])))
    : []
  const exhibits = referenced
    .map(id => data.exhibits.find(e => e.id === id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
  const missingFiles = exhibits.filter(e => !e.fileId)
  add({
    id: 'exhibits',
    label: 'Exhibit files',
    group: 'Exhibits',
    state: missingFiles.length ? 'Failed' : 'Passed',
    detail: !referenced.length
      ? 'No exhibit references in this draft.'
      : missingFiles.length
        ? `Exhibit ${missingFiles.map(e => e.number).join(', ')} is not a PDF. Attach the file in Exhibits.`
        : `${exhibits.length} referenced exhibit${exhibits.length === 1 ? '' : 's'} ready as PDF.`,
    action: { label: 'Open Exhibits', section: 'exhibits' },
    overridable: false,
  })

  const withForms = exhibits.filter(e => e.hasFormFields)
  add({
    id: 'flatten',
    label: 'PDF form fields',
    group: 'Exhibits',
    state: 'Passed',
    detail: withForms.length
      ? `Form fields in Exhibit ${withForms.map(e => e.number).join(', ')} will be flattened when staging.`
      : 'No unflattened form fields.',
    action: { label: 'Open Exhibits', section: 'exhibits' },
    overridable: false,
  })

  add({
    id: 'packet',
    label: 'Packet naming',
    group: 'Documents',
    state: doc && doc.title.trim() && matterCase.number.trim() ? 'Passed' : 'Failed',
    detail:
      doc && doc.title.trim() && matterCase.number.trim()
        ? 'Files will be named from the case number and document title.'
        : 'Add a case number and document title so packet files can be named.',
    action: { label: 'Open draft', section: 'documents', docId: doc?.id },
    overridable: false,
  })

  const failed = checks.filter(c => c.state === 'Failed').length
  const overridden = checks.filter(c => c.state === 'Overridden').length
  return {
    checks,
    passed: checks.filter(c => c.state === 'Passed').length,
    failed,
    overridden,
    total: checks.length,
    ok: failed === 0,
  }
}

export function filingBlockers(result: PreflightResult): PreflightCheck[] {
  return result.checks.filter(c => c.state === 'Failed')
}

export function preflightSummary(result: PreflightResult): string {
  if (result.failed) return `${result.failed} preflight check${result.failed === 1 ? '' : 's'} need attention`
  if (result.overridden) return `Preflight passed with ${result.overridden} logged override${result.overridden === 1 ? '' : 's'}`
  return 'Preflight passed'
}

export function overdueCaseDeadlines(data: AppData, caseId: string) {
  return caseDeadlines(data, caseId).filter(d => daysFromToday(deadlineDate(d)) < 0)
}
