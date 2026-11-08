import { useWorkspace } from '../../core/store'
import { deadlineDate, nextDeadline } from '../../core/deadlines'
import { scanDocument } from '../../core/citations'
import { daysFromToday, deadlinePhrase } from '../../core/util'
import type { Route } from '../../core/types'
import { navigateTo } from '../router'

export function StatusBar({
  route,
  hidden,
}: {
  route: Route
  hidden: boolean
}) {
  const { data, saveState, lastSavedAt } = useWorkspace()
  const matter = route.caseId ? data.cases.find(c => c.id === route.caseId) : undefined
  const doc =
    route.docId ? data.documents.find(d => d.id === route.docId && !d.deletedAt) : undefined
  const next = matter ? nextDeadline(data, matter.id) : undefined
  const issues = doc ? scanDocument(data, doc).findings.filter(f => f.severity === 'error').length : 0
  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : lastSavedAt ? 'Saved' : 'Saved'

  return (
    <footer className={`status-bar ${hidden ? 'hidden' : ''}`} aria-label="Status bar">
      <div className="status-left">
        {matter ? (
          <span className="status-item">
            <strong>
              {matter.number ? `No. ${matter.number}` : 'Case'}
            </strong>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{matter.caption}</span>
          </span>
        ) : (
          <span className="status-item">Legal Matter Workspace</span>
        )}
        {doc ? (
          <>
            <span className="status-sep" />
            <span className="status-item">
              <strong>{doc.title}</strong>
            </span>
            <span className="status-sep" />
            <button
              className="status-item linkish"
              onClick={() => navigateTo({ view: 'case', caseId: doc.caseId, section: 'documents', docId: doc.id })}
              title="Show citation issues"
            >
              Issues: {issues}
            </button>
          </>
        ) : null}
      </div>
      <div className="status-right">
        {next ? (
          <>
            <button
              className="status-item linkish"
              title={`Next deadline: ${next.title}`}
              onClick={() => navigateTo({ view: 'case', caseId: next.caseId, section: 'deadlines' })}
            >
              {next.title} {deadlinePhrase(deadlineDate(next))}
              {daysFromToday(deadlineDate(next)) < 0 ? ' · overdue' : ''}
            </button>
            <span className="status-sep" />
          </>
        ) : null}
        <span className="status-item" title={lastSavedAt ? new Date(lastSavedAt).toLocaleString() : undefined}>
          <span className={`save-dot ${saveState}`} />
          {saveLabel}
        </span>
      </div>
    </footer>
  )
}
