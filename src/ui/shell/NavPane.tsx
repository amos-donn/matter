import { useWorkspace } from '../../core/store'
import type { Route, RouteSection } from '../../core/types'
import { dueSoonCount, overdueCount } from '../../core/deadlines'
import { scanDocument } from '../../core/citations'
import { Icon } from '../kit'
import { navigateTo } from '../router'

const SECTIONS: { id: RouteSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'research', label: 'Research' },
  { id: 'exhibits', label: 'Exhibits' },
  { id: 'filings', label: 'Filings' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'people', label: 'People' },
  { id: 'notes', label: 'Notes' },
]

export function NavPane({
  route,
  collapsed,
  onOpenDialog,
}: {
  route: Route
  collapsed: boolean
  onOpenDialog: (kind: 'new-case' | 'new-document') => void
}) {
  const { data } = useWorkspace()
  const activeCase = route.caseId ? data.cases.find(c => c.id === route.caseId && !c.deletedAt) : undefined
  const cases = data.cases
    .filter(c => !c.deletedAt)
    .slice()
    .sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0) || a.caption.localeCompare(b.caption))
  const rejected = data.filings.filter(f => f.status === 'Rejected').length
  const awaiting = data.filings.filter(f => f.status === 'Staged' || f.status === 'Submitted').length
  const unverified = activeCase
    ? data.documents.filter(d => d.caseId === activeCase.id && !d.deletedAt).reduce((sum, doc) => {
        return sum + scanDocument(data, doc).findings.filter(f => f.severity === 'error').length
      }, 0)
    : 0
  const trash = data.trash.length
  const overdue = overdueCount(data)
  const due = dueSoonCount(data)

  const globalItems = [
    { id: 'today', label: 'Today', icon: 'clock' as const, path: '#/today', badge: 0 },
    { id: 'cases', label: 'Cases', icon: 'folder' as const, path: '#/cases', badge: 0 },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' as const, path: '#/calendar', badge: due },
    { id: 'queue', label: 'Filing Queue', icon: 'filing' as const, path: '#/queue', badge: rejected || awaiting },
    { id: 'library', label: 'Library', icon: 'book' as const, path: '#/library', badge: 0 },
    { id: 'trash', label: 'Recently Deleted', icon: 'trash' as const, path: '#/trash', badge: trash },
  ]

  return (
    <nav className={`nav-pane ${collapsed ? 'collapsed' : ''}`} aria-label="Navigation Pane">
      <div className="nav-header">
        <h2>Workspace</h2>
        <button className="icon-btn" aria-label="New case" title="New case (Ctrl+Shift+N)" onClick={() => onOpenDialog('new-case')}>
          <Icon name="add" size={14} />
        </button>
      </div>
      {globalItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${route.view === item.id ? 'active' : ''}`}
          onClick={() => navigateTo({ view: item.id as Route['view'] })}
        >
          <Icon name={item.icon} />
          <span className="nav-label">{item.label}</span>
          {item.badge ? (
            <span
              className={`nav-badge ${
                item.id === 'queue' && rejected ? 'danger' : item.id === 'calendar' ? 'warn' : 'info'
              }`}
            >
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}

      <div className="nav-section-label">Cases</div>
      {activeCase ? (
        <div className="nav-case">
          <button className="nav-back" onClick={() => navigateTo({ view: 'cases' })}>
            <Icon name="back" size={13} /> All Cases
          </button>
          <div className="nav-case-name">
            <Icon name={activeCase.status === 'Archived' ? 'folder' : 'file'} size={14} />
            <button onClick={() => navigateTo({ view: 'case', caseId: activeCase.id, section: 'overview' })}>
              {activeCase.caption}
            </button>
          </div>
          <div className="nav-sections">
            {SECTIONS.map((section, index) => {
              const active = route.section === section.id
              const badge =
                section.id === 'deadlines' ? overdue : section.id === 'filings' ? rejected : 0
              return (
                <button
                  key={section.id}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => navigateTo({ view: 'case', caseId: activeCase.id, section: section.id })}
                  title={`${section.label} (Ctrl+${index + 1})`}
                >
                  <span className="nav-label">{section.label}</span>
                  {badge ? <span className="nav-badge danger">{badge}</span> : null}
                  {section.id === 'documents' && unverified ? (
                    <span className="nav-badge warn" title={`${unverified} citation issues`}>
                      {unverified}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <div className="nav-case-tools">
            <button className="btn btn-ghost btn-sm" onClick={() => onOpenDialog('new-document')}>
              <Icon name="add" size={13} /> New document
            </button>
          </div>
        </div>
      ) : null}

      {!activeCase && cases.length ? (
        <div>
          {cases.slice(0, 8).map(matter => (
            <button
              key={matter.id}
              className="nav-item"
              onClick={() => navigateTo({ view: 'case', caseId: matter.id, section: 'overview' })}
              title={matter.caption}
            >
              <Icon name="file" size={14} />
              <span className="nav-label">{matter.caption}</span>
              {matter.pinned ? <span className="nav-badge">Pinned</span> : null}
            </button>
          ))}
          {cases.length > 8 ? (
            <button className="nav-item" onClick={() => navigateTo({ view: 'cases' })}>
              <Icon name="more" size={14} />
              <span className="nav-label">All {cases.length} cases</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {!cases.length && !activeCase ? (
        <div className="nav-item" style={{ color: 'var(--text-3)', fontSize: 12, cursor: 'default' }}>
          No cases yet
        </div>
      ) : null}
    </nav>
  )
}
