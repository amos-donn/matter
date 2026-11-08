import { useCallback, useEffect, useState } from 'react'
import type { Route, RouteSection } from '../core/types'

const SECTIONS: RouteSection[] = [
  'overview',
  'documents',
  'research',
  'exhibits',
  'filings',
  'deadlines',
  'people',
  'notes',
]

export function parseRoute(hash = window.location.hash): Route {
  const clean = hash.replace(/^#\/?/, '')
  const parts = clean.split('/').filter(Boolean)
  if (!parts.length) return { view: 'today' }
  switch (parts[0]) {
    case 'cases':
      return { view: 'cases' }
    case 'calendar':
      return { view: 'calendar' }
    case 'queue':
      return { view: 'queue' }
    case 'library':
      return { view: 'library' }
    case 'trash':
      return { view: 'trash' }
    case 'settings':
      return { view: 'settings' }
    case 'audit':
      return { view: 'audit' }
    case 'case': {
      const caseId = parts[1]
      if (!caseId) return { view: 'cases' }
      const maybeSection = parts[2] as RouteSection | undefined
      const section = maybeSection && SECTIONS.includes(maybeSection) ? maybeSection : 'overview'
      if (section === 'documents' && parts[3]) {
        return { view: 'case', caseId, section, docId: parts[3] }
      }
      return { view: 'case', caseId, section }
    }
    default:
      return { view: 'today' }
  }
}

export function routeToHash(route: Route): string {
  if (route.view === 'case' && route.caseId) {
    const section = route.section || 'overview'
    return route.docId
      ? `#/case/${route.caseId}/${section}/${route.docId}`
      : `#/case/${route.caseId}/${section}`
  }
  if (route.view === 'today') return '#/today'
  return `#/${route.view}`
}

export function navigateTo(route: Route) {
  const hash = routeToHash(route)
  if (window.location.hash !== hash) window.location.hash = hash
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseRoute())
  useEffect(() => {
    const onChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    } else {
      setRoute(parseRoute(hash))
    }
    window.scrollTo({ top: 0 })
  }, [])
  return { route, navigate }
}
