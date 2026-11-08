import type {
  AppData,
  Authority,
  Citation,
  CitationStatus,
  MatterDoc,
  MatterCase,
  DocBlock,
} from './types'
import { daysFromToday, stripTokens } from './util'

/* ------------------------------------------------------------------ */
/* Inline reference tokens                                             */
/*   {{cite:<citationId>:<pinpoint>}}                                  */
/*   {{ex:<exhibitId>:<page>}}                                         */
/* ------------------------------------------------------------------ */

export const CITE_TOKEN = /\{\{cite:([A-Za-z0-9_-]+)(?::([^}]*))?\}\}/g
export const EXHIBIT_TOKEN = /\{\{ex:([A-Za-z0-9_-]+)(?::([^}]*))?\}\}/g

export interface TokenMatch {
  kind: 'cite' | 'exhibit'
  id: string
  detail: string
  raw: string
  index: number
}

export function findTokens(text: string): TokenMatch[] {
  const out: TokenMatch[] = []
  for (const m of text.matchAll(CITE_TOKEN)) {
    out.push({ kind: 'cite', id: m[1], detail: m[2] || '', raw: m[0], index: m.index ?? 0 })
  }
  for (const m of text.matchAll(EXHIBIT_TOKEN)) {
    out.push({ kind: 'exhibit', id: m[1], detail: m[2] || '', raw: m[0], index: m.index ?? 0 })
  }
  return out.sort((a, b) => a.index - b.index)
}

export function makeCiteToken(citationId: string, pinpoint = ''): string {
  return `{{cite:${citationId}${pinpoint ? ':' + pinpoint.replace(/[{}]/g, '') : ''}}}`
}

export function makeExhibitToken(exhibitId: string, page?: number | string): string {
  return `{{ex:${exhibitId}${page ? ':' + page : ''}}}`
}

export function authority(data: AppData, id: string): Authority | undefined {
  return data.authorities.find(a => a.id === id)
}

export function citationRecord(data: AppData, id: string): Citation | undefined {
  return data.citations.find(c => c.id === id)
}

/** Full citation form with an optional pinpoint, e.g. "Bell Atlantic Corp. v. Twombly, 550 U.S. 544, 556 (2007)". */
export function citationText(auth: Authority, pinpoint = ''): string {
  const pin = pinpoint.trim()
  return `${auth.caseName}, ${auth.reporter}${pin ? `, ${pin}` : ''} (${auth.year})`
}

export function citeDisplay(data: AppData, citationId: string, pinpoint = ''): {
  text: string
  status: CitationStatus | 'Missing'
  authority?: Authority
  citation?: Citation
} {
  const citation = citationRecord(data, citationId)
  if (!citation) return { text: 'Missing citation', status: 'Missing' }
  const auth = authority(data, citation.authorityId)
  if (!auth) return { text: 'Missing authority', status: 'Missing', citation }
  return {
    text: citationText(auth, pinpoint || citation.pinpoint),
    status: citation.status,
    authority: auth,
    citation,
  }
}

export function exhibitDisplay(data: AppData, exhibitId: string, page = ''): {
  text: string
  missing: boolean
  exhibitId?: string
} {
  const ex = data.exhibits.find(e => e.id === exhibitId && !e.deletedAt)
  if (!ex) return { text: `Broken exhibit reference`, missing: true }
  return {
    text: page ? `Ex. ${ex.number}, p. ${page}` : `Ex. ${ex.number}`,
    missing: false,
    exhibitId,
  }
}

/** Render a paragraph's tokens to plain text (used for export, search and word counts). */
export function renderText(data: AppData, text: string): string {
  return text
    .replace(CITE_TOKEN, (_full, id, pinch) => {
      const shown = citeDisplay(data, id, pinch || '')
      return shown.status === 'Missing' ? '[missing citation]' : shown.text
    })
    .replace(EXHIBIT_TOKEN, (_full, id, page) => {
      const shown = exhibitDisplay(data, id, page || '')
      return shown.missing ? '[broken exhibit reference]' : shown.text
    })
}

export interface DocCitationUse {
  citationId: string
  blockId: string
  blockIndex: number
  pinpoint: string
  count: number
}

export function docCitationUses(data: AppData, doc: MatterDoc): DocCitationUse[] {
  const uses: DocCitationUse[] = []
  doc.blocks.forEach((block, blockIndex) => {
    for (const token of findTokens(block.text)) {
      if (token.kind !== 'cite') continue
      uses.push({
        citationId: token.id,
        blockId: block.id,
        blockIndex,
        pinpoint: token.detail,
        count: 1,
      })
    }
  })
  return uses
}

export function docExhibitUses(doc: MatterDoc): { exhibitId: string; blockId: string; page: string }[] {
  const uses: { exhibitId: string; blockId: string; page: string }[] = []
  for (const block of doc.blocks) {
    for (const token of findTokens(block.text)) {
      if (token.kind === 'exhibit') {
        uses.push({ exhibitId: token.id, blockId: block.id, page: token.detail })
      }
    }
  }
  return uses
}

export function countExhibitReferences(data: AppData, exhibitId: string): { docId: string; docTitle: string }[] {
  const refs: { docId: string; docTitle: string }[] = []
  for (const doc of data.documents) {
    if (doc.deletedAt) continue
    if (docExhibitUses(doc).some(u => u.exhibitId === exhibitId)) {
      refs.push({ docId: doc.id, docTitle: doc.title })
    }
  }
  return refs
}

export function countCitationReferences(data: AppData, citationId: string): { docId: string; docTitle: string }[] {
  const refs: { docId: string; docTitle: string }[] = []
  for (const doc of data.documents) {
    if (doc.deletedAt) continue
    if (docCitationUses(data, doc).some(u => u.citationId === citationId)) {
      refs.push({ docId: doc.id, docTitle: doc.title })
    }
  }
  return refs
}

/* ------------------------------------------------------------------ */
/* Citation scan                                                       */
/* ------------------------------------------------------------------ */

const REPORTER_PATTERN =
  /\b\d{1,4}\s+(?:U\.S\.|S\.\s?Ct\.|L\.\s?Ed\.\s?2d|F\.\s?(?:2d|3d|4th)|F\.\s?Supp\.\s?(?:2d|3d)?|A\.\s?(?:2d|3d)|Vt\.|VT)\s+\d{1,5}\b/g

export interface RawCitationLookalike {
  text: string
  blockId: string
  blockIndex: number
  matchedAuthority?: Authority
}

export interface ScanFinding {
  id: string
  kind:
    | 'unverified'
    | 'flagged'
    | 'missing-record'
    | 'missing-authority'
    | 'missing-pinpoint'
    | 'raw-citation'
    | 'broken-exhibit'
  severity: 'error' | 'warning'
  title: string
  detail: string
  blockId?: string
  blockIndex?: number
  citationId?: string
  authorityId?: string
  exhibitId?: string
}

export interface ScanResult {
  findings: ScanFinding[]
  citedCount: number
  unverifiedCount: number
  flaggedCount: number
  rawCount: number
  issues: number
}

export function scanDocument(data: AppData, doc: MatterDoc): ScanResult {
  const findings: ScanFinding[] = []
  const seen = new Set<string>()
  const uses = docCitationUses(data, doc)
  const citedCount = uses.length

  for (const use of uses) {
    const citation = citationRecord(data, use.citationId)
    const blockIndex = use.blockIndex
    if (!citation) {
      const key = `missing-${use.citationId}`
      if (!seen.has(key)) {
        seen.add(key)
        findings.push({
          id: key,
          kind: 'missing-record',
          severity: 'error',
          title: 'Citation has no record',
          detail: 'A citation link points to a record that no longer exists. Restore the authority or remove the link.',
          blockId: use.blockId,
          blockIndex,
          citationId: use.citationId,
        })
      }
      continue
    }
    const auth = authority(data, citation.authorityId)
    if (!auth) {
      findings.push({
        id: `missing-auth-${citation.id}`,
        kind: 'missing-authority',
        severity: 'error',
        title: 'Authority record is missing',
        detail: 'The authority behind this citation was removed. The citation is Unverified until it is restored or replaced.',
        blockId: use.blockId,
        blockIndex,
        citationId: citation.id,
      })
      continue
    }
    if (citation.status === 'Unverified') {
      findings.push({
        id: `unverified-${citation.id}`,
        kind: 'unverified',
        severity: 'error',
        title: `${auth.caseName} is Unverified`,
        detail: 'Check the citation elsewhere and mark it verified, or override with a recorded reason.',
        blockId: use.blockId,
        blockIndex,
        citationId: citation.id,
        authorityId: auth.id,
      })
    }
    if (citation.status === 'Flagged') {
      findings.push({
        id: `flagged-${citation.id}`,
        kind: 'flagged',
        severity: 'error',
        title: `${auth.caseName} is Flagged`,
        detail: citation.flagReason || 'This authority was flagged. Resolve the flag before filing.',
        blockId: use.blockId,
        blockIndex,
        citationId: citation.id,
        authorityId: auth.id,
      })
    }
    if (!use.pinpoint && !citation.pinpoint) {
      findings.push({
        id: `pin-${citation.id}-${use.blockId}`,
        kind: 'missing-pinpoint',
        severity: 'warning',
        title: `No pinpoint for ${auth.caseName}`,
        detail: 'Add a page or paragraph pinpoint if the proposition depends on a specific passage.',
        blockId: use.blockId,
        blockIndex,
        citationId: citation.id,
        authorityId: auth.id,
      })
    }
  }

  for (const block of doc.blocks) {
    const text = renderText(data, block.text)
    for (const m of text.matchAll(REPORTER_PATTERN)) {
      // A reporter citation is expected to sit next to a citation record; if the
      // block has no linked citation for that reporter, surface it for review.
      const linked = uses.some(use => {
        const citation = citationRecord(data, use.citationId)
        const auth = citation ? authority(data, citation.authorityId) : undefined
        return auth ? auth.reporter.startsWith(m[0].split(/\s+Vt\.|\s+U\.S\./)[0]) : false
      })
      if (linked) continue
      const matchedAuthority = data.authorities.find(a => m[0].includes(a.reporter))
      findings.push({
        id: `raw-${block.id}-${m.index}`,
        kind: 'raw-citation',
        severity: 'warning',
        title: `${m[0]} has no saved record`,
        detail: matchedAuthority
          ? `The index has ${matchedAuthority.caseName}. Save it to the case and replace the typed citation with a link.`
          : 'Create an authority record for this citation and use References > Cite.',
        blockId: block.id,
        blockIndex: doc.blocks.indexOf(block),
        authorityId: matchedAuthority?.id,
      })
    }

    for (const token of findTokens(block.text)) {
      if (token.kind === 'exhibit' && !data.exhibits.some(e => e.id === token.id && !e.deletedAt)) {
        findings.push({
          id: `broken-ex-${token.id}-${block.id}`,
          kind: 'broken-exhibit',
          severity: 'error',
          title: 'Broken exhibit reference',
          detail: 'The exhibit was removed. Restore it from Recently Deleted or replace the reference.',
          blockId: block.id,
          blockIndex: doc.blocks.indexOf(block),
          exhibitId: token.id,
        })
      }
    }
  }

  const unverifiedCount = new Set(
    findings.filter(f => f.kind === 'unverified' && f.citationId).map(f => f.citationId),
  ).size
  const flaggedCount = new Set(
    findings.filter(f => f.kind === 'flagged' && f.citationId).map(f => f.citationId),
  ).size
  const rawCount = findings.filter(f => f.kind === 'raw-citation').length
  const blocking = findings.filter(f => f.severity === 'error').length

  return {
    findings,
    citedCount,
    unverifiedCount,
    flaggedCount,
    rawCount,
    issues: blocking + findings.filter(f => f.kind === 'missing-pinpoint').length,
  }
}

export function combineScanFindings(scan: ScanResult): string {
  const parts: string[] = []
  if (scan.unverifiedCount) parts.push(`${scan.unverifiedCount} unverified`)
  if (scan.flaggedCount) parts.push(`${scan.flaggedCount} flagged`)
  if (scan.rawCount) parts.push(`${scan.rawCount} without records`)
  return parts.join(', ') || 'No citation issues'
}

export function docIssues(data: AppData, doc: MatterDoc): number {
  return scanDocument(data, doc).findings.filter(f => f.severity === 'error').length
}

/* ------------------------------------------------------------------ */
/* Tables of authorities / contents                                    */
/* ------------------------------------------------------------------ */

export interface AuthorityTableRow {
  authority: Authority
  pages: number[]
  pinpoints: string[]
}

export function tableOfAuthorities(data: AppData, doc: MatterDoc): AuthorityTableRow[] {
  const rows = new Map<string, AuthorityTableRow>()
  for (const use of docCitationUses(data, doc)) {
    const citation = citationRecord(data, use.citationId)
    const auth = citation ? authority(data, citation.authorityId) : undefined
    if (!auth) continue
    const row = rows.get(auth.id) ?? { authority: auth, pages: [], pinpoints: [] }
    if (use.pinpoint && !row.pinpoints.includes(use.pinpoint)) row.pinpoints.push(use.pinpoint)
    rows.set(auth.id, row)
  }
  return Array.from(rows.values()).sort((a, b) =>
    a.authority.caseName.localeCompare(b.authority.caseName),
  )
}

export function headingEntries(doc: MatterDoc): { block: DocBlock; index: number; text: string }[] {
  return doc.blocks
    .map((block, index) => ({ block, index, text: block.text }))
    .filter(x => x.block.type === 'heading' && x.text.trim())
}

/* ------------------------------------------------------------------ */
/* Outbound research                                                   */
/* ------------------------------------------------------------------ */

export function approvedService(data: AppData, id: string) {
  return data.settings.approvedServices.find(s => s.id === id)
}

export function canUseService(data: AppData, id: string): boolean {
  const svc = approvedService(data, id)
  if (!svc) return false
  return svc.approved && Boolean(svc.token || !svc.endpoint)
}

export interface CourtListenerResult {
  caseName: string
  court: string
  reporter: string
  year: number
  url: string
  summary: string
}

export async function searchCourtListener(data: AppData, query: string): Promise<CourtListenerResult[]> {
  const svc = approvedService(data, 'svc_courtlistener')
  if (!svc) throw new Error('CourtListener is not configured.')
  if (!svc.approved) throw new Error('CourtListener is not approved. Approve it in Options > Approved Services first.')
  if (!svc.token) throw new Error('Add a CourtListener API token in Options > Approved Services.')
  const url = `${svc.endpoint}?q=${encodeURIComponent(query)}&type=o&order_by=score%20desc`
  const res = await fetch(url, {
    headers: { Authorization: `Token ${svc.token}` },
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error(`CourtListener returned ${res.status}. Check the token and try again.`)
  const json = (await res.json()) as { results?: any[] }
  return (json.results || []).slice(0, 12).map(r => ({
    caseName: r.caseName || r.case_name || 'Untitled opinion',
    court: r.court || r.court_citation_short || '',
    reporter: [r.citation?.[0], r.citation?.[1]].filter(Boolean).join(' ') || r.docketNumber || '',
    year: Number(r.dateFiled?.slice(0, 4)) || new Date().getFullYear(),
    url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : 'https://www.courtlistener.com/',
    summary: stripTokens((r.snippet || '') as string).replace(/<[^>]+>/g, ''),
  }))
}

export function citationAge(citation: Citation): string {
  if (!citation.checkedAt) return 'Status not checked'
  const days = Math.abs(daysFromToday(citation.checkedAt.slice(0, 10)))
  return `Checked ${days === 0 ? 'today' : `${days} days ago`}${citation.checkedSource ? ` · ${citation.checkedSource}` : ''}`
}

export function requiredSections(matterCase: MatterCase): string[] {
  return matterCase.role === 'Appellant'
    ? ['Statement of the Case', 'Statement of the Issues', 'Argument', 'Certificate of Service']
    : ['Statement of the Case', 'Argument', 'Certificate of Service']
}
