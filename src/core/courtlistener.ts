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
