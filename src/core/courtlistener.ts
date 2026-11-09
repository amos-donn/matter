// CourtListener (Free Law Project) REST API v4 — public case-law search.
// Docs: https://www.courtlistener.com/api/rest/v4/search/
// A free account token is required for search. Only the typed query leaves the app.

export const COURTLISTENER_SEARCH_URL = 'https://www.courtlistener.com/api/rest/v4/search/'

export interface OpinionResult {
  id: string
  caseName: string
  citation: string
  court: string
  courtId: string
  year: number
  dateFiled: string
  docketNumber: string
  url: string
  snippet: string
}

interface RawOpinion {
  id?: number | string
  caseName?: string
  case_name?: string
  citation?: string | string[]
  court?: string
  court_id?: string
  dateFiled?: string
  date_filed?: string
  docketNumber?: string
  docket_number?: string
  absolute_url?: string
  snippet?: string
}

interface RawSearchResponse {
  count?: number
  results?: RawOpinion[]
  detail?: string
}

const TAG_RE = /<[^>]*>/g
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

function plainText(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(TAG_RE, '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, match => ENTITIES[match] || match)
    .replace(/\s+/g, ' ')
    .trim()
}

function opinionUrl(raw: RawOpinion): string {
  const path = raw.absolute_url || ''
  if (!path) return ''
  return path.startsWith('http') ? path : `https://www.courtlistener.com${path.startsWith('/') ? '' : '/'}${path}`
}

export function toOpinionResult(raw: RawOpinion): OpinionResult {
  const citations = Array.isArray(raw.citation) ? raw.citation : raw.citation ? [raw.citation] : []
  const dateFiled = raw.dateFiled || raw.date_filed || ''
  const parsedYear = Number(dateFiled.slice(0, 4))
  return {
    id: String(raw.id ?? `${raw.caseName || raw.case_name || 'opinion'}-${dateFiled}`),
    caseName: plainText(raw.caseName || raw.case_name) || 'Untitled opinion',
    citation: plainText(citations[0]) || plainText(raw.docketNumber || raw.docket_number),
    court: plainText(raw.court) || plainText(raw.court_id),
    courtId: plainText(raw.court_id),
    year: Number.isFinite(parsedYear) ? parsedYear : 0,
    dateFiled,
    docketNumber: plainText(raw.docketNumber || raw.docket_number),
    url: opinionUrl(raw),
    snippet: plainText(raw.snippet),
  }
}

export async function searchOpinions({
  query,
  token,
  endpoint,
  court,
  pageSize = 20,
  signal,
}: {
  query: string
  token: string
  endpoint?: string
  court?: string
  pageSize?: number
  signal?: AbortSignal
}): Promise<{ results: OpinionResult[]; count: number }> {
  const trimmed = query.trim()
  if (!trimmed) return { results: [], count: 0 }
  if (!token.trim()) throw new Error('Add a CourtListener API token under Options > Approved services.')

  const url = new URL(endpoint?.trim() || COURTLISTENER_SEARCH_URL)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('type', 'o')
  url.searchParams.set('page_size', String(pageSize))
  url.searchParams.set('order_by', 'score desc')
  if (court) url.searchParams.set('court', court)

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', Authorization: `Token ${token.trim()}` },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('CourtListener could not be reached. Check the connection and try again.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('CourtListener rejected the token. Check the token under Options > Approved services.')
  }
  if (response.status === 429) {
    throw new Error('CourtListener rate limit reached. Wait a moment and search again.')
  }
  if (!response.ok) {
    throw new Error(`CourtListener returned ${response.status}. Try again.`)
  }

  const body = (await response.json()) as RawSearchResponse
  const results = (body.results || []).map(toOpinionResult)
  return { results, count: body.count ?? results.length }
}

/* ------------------------------------------------------------------ */
/* Full opinion text                                                   */
/* ------------------------------------------------------------------ */

interface RawOpinionText {
  plain_text?: string
  html_with_citations?: string
  html?: string
  html_lawbox?: string
  html_columbia?: string
  html_anon_2020?: string
  xml_harvard?: string
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  sect: '§',
  para: '¶',
  copy: '©',
  reg: '®',
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const named = NAMED_ENTITIES[entity.toLowerCase()]
    if (named) return named
    try {
      if (/^#x/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16))
      if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10))
    } catch {
      return match
    }
    return match
  })
}

/** Convert CourtListener opinion HTML into block-separated plain text. */
export function opinionHtmlToText(html: string): string {
  const text = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|section|article|h[1-6]|li|tr|blockquote|pre|table|ul|ol|dl|dt|dd)\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
  return decodeEntities(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Split opinion text into paragraphs for the in-app reader. */
export function opinionParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s+\n/g, '\n').trim())
    .filter(Boolean)
}

function opinionDetailUrl(opinionId: string, endpoint?: string): string {
  const id = encodeURIComponent(opinionId)
  const configured = endpoint?.trim()
  if (configured) {
    try {
      const root = configured.replace(/search\/?$/i, '').replace(/\/?$/, '/')
      return new URL(`opinions/${id}/`, root).toString()
    } catch {
      /* fall through to the public endpoint */
    }
  }
  return `https://www.courtlistener.com/api/rest/v4/opinions/${id}/`
}

/** Fetch the full text of an opinion. The reader renders this inside the app. */
export async function fetchOpinionText({
  opinionId,
  token,
  endpoint,
  signal,
}: {
  opinionId: string
  token: string
  endpoint?: string
  signal?: AbortSignal
}): Promise<string> {
  if (!opinionId.trim()) throw new Error('The opinion identifier is missing.')
  if (!token.trim()) throw new Error('Add a CourtListener API token under Options > Approved services.')

  const url = new URL(opinionDetailUrl(opinionId.trim(), endpoint))
  url.searchParams.set('fields', 'id,plain_text,html_with_citations,html,html_lawbox,html_columbia,xml_harvard')

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', Authorization: `Token ${token.trim()}` },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('CourtListener could not be reached. Check the connection and try again.')
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('CourtListener rejected the token. Check the token under Options > Approved services.')
  }
  if (response.status === 404) {
    throw new Error('CourtListener has no full text stored for this opinion.')
  }
  if (response.status === 429) {
    throw new Error('CourtListener rate limit reached. Wait a moment and try again.')
  }
  if (!response.ok) throw new Error(`CourtListener returned ${response.status}. Try again.`)

  const body = (await response.json()) as RawOpinionText
  const fromHtmlWithCitations = opinionHtmlToText(body.html_with_citations || '')
  const fromPlainText = (body.plain_text || '').trim()
  const candidates = [
    fromHtmlWithCitations.length >= fromPlainText.length ? fromHtmlWithCitations : fromPlainText,
    fromPlainText,
    opinionHtmlToText(body.html || ''),
    opinionHtmlToText(body.html_lawbox || ''),
    opinionHtmlToText(body.html_columbia || ''),
    opinionHtmlToText(body.html_anon_2020 || ''),
    opinionHtmlToText(body.xml_harvard || ''),
  ].filter(candidate => candidate.length > 0)

  const text = candidates[0] || ''
  if (!text) throw new Error('CourtListener has no readable text stored for this opinion.')
  return text
}
