import { useMemo, useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from '../ui/ui'
import { navigateTo } from '../ui/router'
import { Badge, Button, EmptyState, Icon, PageHeader, Select, Status, TextInput } from '../ui/kit'
import { caseDeadlines, deadlineDate, deadlineState, monthCells, nextDeadline } from '../core/deadlines'
import { daysFromToday, formatDate, formatShortDate, truncate } from '../core/util'
import { scanDocument } from '../core/citations'
import { searchWorkspace } from '../core/search'
import { downloadBlob, safeFilename } from '../core/util'
import type { Filing } from '../core/types'
import { runPreflight } from '../core/preflight'
import { caseDocs, caseTitle } from '../ui/helpers'

export function TodayView() {
  const { data, createFiling } = useWorkspace()
  const { openDialog } = useUi()
  const active = data.cases.filter(c => !c.deletedAt && c.status === 'Active')
  const upcoming = data.deadlines
    .filter(d => {
      const matter = active.find(c => c.id === d.caseId)
      if (!matter) return false
      const diff = daysFromToday(deadlineDate(d))
      return diff >= 0 && diff <= 7
    })
    .sort((a, b) => deadlineDate(a).localeCompare(deadlineDate(b)))
  const overdue = data.deadlines.filter(d => {
    const c = active.find(x => x.id === d.caseId)
    return c && !d.override && daysFromToday(deadlineDate(d)) < 0
  })
  const drafts = data.documents
    .filter(d => !d.deletedAt && active.some(c => c.id === d.caseId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
  const awaiting = data.filings.filter(
    f => (f.status === 'Staged' || f.status === 'Submitted') && active.some(c => c.id === f.caseId),
  )
  const rejected = data.filings.filter(f => f.status === 'Rejected' && active.some(c => c.id === f.caseId))
  const dueCount = upcoming.length

  return (
    <div className="page">
      <PageHeader
        title="Today"
        subtitle={<span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {active.length} active {active.length === 1 ? 'case' : 'cases'}</span>}
        actions={<>
          <Button icon="add" onClick={() => openDialog('new-case')}>New case</Button>
          <Button icon="search" onClick={() => window.dispatchEvent(new CustomEvent('lmt:open-search'))}>Find across case</Button>
        </>}
      />
      <div className="stat-grid">
        <button className={`stat ${dueCount ? 'clickable' : ''}`} onClick={() => navigateTo({ view: 'calendar' })}>
          <Icon name="clock" className="stat-icon" /><div><div className="stat-value">{dueCount}</div><div className="stat-label">Deadlines in the next 7 days</div></div>
        </button>
        <button className={`stat clickable ${overdue.length ? 'stat-danger' : ''}`} onClick={() => navigateTo({ view: 'calendar' })}>
          <Icon name={overdue.length ? 'warning' : 'check'} className="stat-icon" /><div><div className="stat-value">{overdue.length}</div><div className="stat-label">Overdue deadlines</div></div>
        </button>
        <button className="stat clickable" onClick={() => navigateTo({ view: 'queue' })}>
          <Icon name="filing" className="stat-icon" /><div><div className="stat-value">{awaiting.length}</div><div className="stat-label">Filings awaiting a recorded result</div></div>
        </button>
        <button className={`stat clickable ${rejected.length ? 'stat-danger' : ''}`} onClick={() => navigateTo({ view: 'queue' })}>
          <Icon name="warning" className="stat-icon" /><div><div className="stat-value">{rejected.length}</div><div className="stat-label">Rejected filings</div></div>
        </button>
      </div>

      {rejected.length ? (
        <section className="panel" style={{ marginBottom: 16, borderColor: 'var(--danger)' }}>
          <div className="panel-head"><div className="panel-title"><Icon name="warning" /> Rejected filings need attention</div><Button size="sm" onClick={() => navigateTo({ view: 'queue' })}>Open Filing Queue</Button></div>
          {rejected.map(f => (
            <div className="list-row" key={f.id}>
              <div className="list-main"><div className="list-title">{caseTitle(data, f.caseId)}</div><div className="list-meta"><span>Envelope {f.envelopeNumber || '—'}</span><span>{f.rejectionReason || 'No reason recorded'}</span></div></div>
              <Button size="sm" onClick={() => navigateTo({ view: 'case', caseId: f.caseId, section: 'filings' })}>Open filing</Button>
            </div>
          ))}
        </section>
      ) : null}

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><div className="panel-title"><Icon name="clock" /> Deadlines</div><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'calendar' })}>Calendar</Button></div>
          {upcoming.length || overdue.length ? (
            <>
              {overdue.slice(0, 4).map(d => (
                <div className="list-row" key={d.id}>
                  <Icon name="warning" />
                  <div className="list-main"><div className="list-title">{d.title}</div><div className="list-meta"><span>{caseTitle(data, d.caseId)}</span><span className="due-note">{Math.abs(daysFromToday(deadlineDate(d)))} days overdue</span></div></div>
                  <Button size="sm" onClick={() => navigateTo({ view: 'case', caseId: d.caseId, section: 'deadlines' })}>Open</Button>
                </div>
              ))}
              {upcoming.map(d => (
                <div className="list-row" key={d.id}>
                  <Icon name="clock" />
                  <div className="list-main"><div className="list-title">{d.title}</div><div className="list-meta"><span>{caseTitle(data, d.caseId)}</span><span>{formatDate(deadlineDate(d))} · {daysFromToday(deadlineDate(d)) === 0 ? 'today' : `in ${daysFromToday(deadlineDate(d))} days`}</span></div></div>
                  <Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId: d.caseId, section: 'deadlines' })}>Open</Button>
                </div>
              ))}
            </>
          ) : <div className="table-empty">No deadlines due in the next seven days.</div>}
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title"><Icon name="file" /> Drafts in progress</div></div>
          {drafts.length ? drafts.map(doc => {
            const issues = scanDocument(data, doc).findings.filter(f => f.severity === 'error').length
            return (
              <div className="list-row" key={doc.id}>
                <div className="list-main"><div className="list-title">{doc.title}</div><div className="list-meta"><span>{caseTitle(data, doc.caseId)}</span><span>{doc.kind}</span>{issues ? <Badge tone="danger">{issues} citation issues</Badge> : <Badge tone="success">Citations clear</Badge>}</div></div>
                <Button size="sm" onClick={() => navigateTo({ view: 'case', caseId: doc.caseId, section: 'documents', docId: doc.id })}>Open</Button>
              </div>
            )
          }) : <div className="table-empty">No drafts yet. Open a case and start from a template.</div>}
          {awaiting.length ? (
            <>
              <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}><div className="panel-title"><Icon name="filing" /> Filings awaiting a result</div></div>
              {awaiting.map(f => (
                <div className="list-row" key={f.id}>
                  <Status state={f.status} />
                  <div className="list-main"><div className="list-title">{caseTitle(data, f.caseId)}</div><div className="list-meta"><span>{f.type}</span><span>{f.filingCode}</span></div></div>
                  <Button size="sm" onClick={() => openDialog('record-result', { filingId: f.id })}>Record result</Button>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CasesView() {
  const { data, setCaseStatus } = useWorkspace()
  const { openDialog, toast } = useUi()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Active')
  const cases = data.cases
    .filter(c => !c.deletedAt)
    .filter(c => filter === 'All' || c.status === filter)
    .filter(c => `${c.caption} ${c.number} ${c.clientId}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.pinned || 0) - Number(a.pinned || 0) || a.caption.localeCompare(b.caption))

  return (
    <div className="page">
      <PageHeader title="Cases" subtitle="Every case holds its drafts, research, exhibits, filings, deadlines, people, and notes." actions={<Button variant="primary" icon="add" onClick={() => openDialog('new-case')}>New case</Button>} />
      <div className="case-toolbar">
        <div className="search-box"><Icon name="search" /><TextInput placeholder="Search caption, number, Client ID" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 150 }}><option>Active</option><option>Archived</option><option>All</option></Select>
        <span className="tiny">{cases.length} {cases.length === 1 ? 'case' : 'cases'}</span>
      </div>
      <div className="panel panel-body flush">
        {cases.length ? (
          <div className="case-list">
            {cases.map(matter => {
              const next = nextDeadline(data, matter.id)
              const state = next ? deadlineState(next) : null
              return (
                <div className={`case-row ${matter.pinned ? 'pinned' : ''} ${matter.status === 'Archived' ? 'case-archived' : ''}`} key={matter.id} onClick={() => navigateTo({ view: 'case', caseId: matter.id, section: 'overview' })}>
                  <div><div className="case-caption">{matter.caption}</div><div className="case-sub"><span>{matter.court}</span><span>No. {matter.number || '—'}</span>{matter.clientId ? <span>Client ID {matter.clientId}</span> : null}</div></div>
                  <div><span className={`case-deadline ${state === 'Overdue' ? 'overdue' : state === 'Due Soon' ? 'due' : ''}`}><Icon name={state === 'Overdue' ? 'warning' : 'clock'} size={14} />{next ? `${next.title} · ${formatShortDate(deadlineDate(next))}` : 'No deadline'}</span></div>
                  <div><Status state={matter.status} /></div>
                  <div className="case-side" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId: matter.id, section: 'overview' })}>Open</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setCaseStatus(matter.id, matter.status === 'Active' ? 'Archived' : 'Active'); toast(matter.status === 'Active' ? 'Case archived. It is read-only until it is restored.' : 'Case restored to active.', { tone: 'success' }) }}>{matter.status === 'Active' ? 'Archive' : 'Restore'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Case', objectId: matter.id })} title="Move to Recently Deleted">Delete</Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <EmptyState icon="folder" title={query ? 'No cases match that search' : 'No cases yet'} body={query ? 'Try a different caption, case number, or Client ID.' : 'Create a case with its caption, court, case number, role, and trigger event. Deadlines appear as you enter the trigger date.'} action={<Button variant="primary" icon="add" onClick={() => openDialog('new-case')}>New case</Button>} />}
      </div>
    </div>
  )
}

export function CalendarView() {
  const { data } = useWorkspace()
  const [mode, setMode] = useState<'Month' | 'Agenda'>('Month')
  const today = new Date()
  const [anchor, setAnchor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const active = new Map(data.cases.filter(c => !c.deletedAt && c.status === 'Active').map(c => [c.id, c]))
  const published = data.deadlines.filter(d => active.has(d.caseId)).sort((a, b) => deadlineDate(a).localeCompare(deadlineDate(b)))
  const cells = monthCells(anchor.getFullYear(), anchor.getMonth())
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="page">
      <PageHeader title="Calendar" subtitle="Read-only. Deadlines change only inside their case." actions={<><Button onClick={() => setMode(mode === 'Month' ? 'Agenda' : 'Month')}>{mode === 'Month' ? 'Agenda view' : 'Month view'}</Button><Button onClick={() => setAnchor(new Date(today.getFullYear(), today.getMonth(), 1))}>This month</Button></>} />
      <div className="calendar-toolbar">
        <Button icon="back" size="sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} aria-label="Previous month" />
        <strong style={{ minWidth: 180 }}>{monthLabel}</strong>
        <Button icon="chevron-right" size="sm" onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} aria-label="Next month" />
        <span className="tiny">Month and agenda views. Week view follows the same deadlines.</span>
      </div>
      {mode === 'Month' ? (
        <div className="calendar-grid">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <div className="calendar-dow" key={d}>{d}</div>)}
          {cells.map(cell => {
            const iso = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`
            const isToday = cell.toDateString() === today.toDateString()
            const inMonth = cell.getMonth() === anchor.getMonth()
            const events = published.filter(d => deadlineDate(d) === iso)
            return (
              <div className={`calendar-cell ${inMonth ? '' : 'outside'} ${isToday ? 'today' : ''}`} key={iso}>
                <div className="calendar-date">{cell.getDate()}</div>
                {events.slice(0, 3).map(d => (
                  <button key={d.id} className={`calendar-event ${deadlineState(d) === 'Overdue' ? 'overdue' : deadlineState(d) === 'Due Soon' ? 'due' : ''}`} title={`${d.title} — ${active.get(d.caseId)?.caption}`} onClick={() => navigateTo({ view: 'case', caseId: d.caseId, section: 'deadlines' })}>{d.title}</button>
                ))}
                {events.length > 3 ? <div className="tiny">+{events.length - 3} more</div> : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="panel panel-body flush">
          {published.filter(d => deadlineDate(d) >= `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-01`).slice(0, 80).length ? (
            published.filter(d => deadlineDate(d) >= `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-01`).slice(0, 80).map(d => (
              <div className="list-row" key={d.id}>
                <div style={{ width: 120 }}><div className="list-title">{formatShortDate(deadlineDate(d))}</div><div className="list-meta">{deadlineState(d)}</div></div>
                <div className="list-main"><div className="list-title">{d.title}</div><div className="list-meta"><span>{caseTitle(data, d.caseId)}</span><span>{d.triggerLabel}</span></div></div>
                <Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId: d.caseId, section: 'deadlines' })}>Open</Button>
              </div>
            ))
          ) : <div className="table-empty">No deadlines in this month.</div>}
        </div>
      )}
    </div>
  )
}

export function FilingQueueView() {
  const { data, readFileBytes } = useWorkspace()
  const { openDialog, toast } = useUi()
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const order: Record<string, number> = { Rejected: 0, Staged: 1, Submitted: 2, Draft: 3, Accepted: 4, Served: 5 }
  const filings = data.filings
    .filter(f => !data.cases.find(c => c.id === f.caseId)?.deletedAt)
    .filter(f => filter === 'All' || f.status === filter)
    .filter(f => `${caseTitle(data, f.caseId)} ${f.filingCode} ${f.envelopeNumber}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt))

  const download = async (filing: Filing) => {
    const packet = filing.stagedFiles.find(s => s.kind === 'Packet' && s.fileId)
    if (!packet?.fileId) return toast('This filing has no staged packet.')
    const bytes = await readFileBytes(packet.fileId)
    if (bytes) downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }), packet.name)
  }

  return (
    <div className="page">
      <PageHeader title="Filing Queue" subtitle="Every filing across cases. Rejected filings appear first." actions={<Button onClick={() => toast('Open a case to start a filing.')}>New filing</Button>} />
      <div className="case-toolbar">
        <div className="search-box"><Icon name="search" /><TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Search case, code, envelope" /></div>
        <Select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 170 }}><option>All</option><option>Draft</option><option>Staged</option><option>Submitted</option><option>Accepted</option><option>Rejected</option><option>Served</option></Select>
      </div>
      <div className="panel panel-body flush">
        {filings.length ? filings.map(f => (
          <div className="list-row" key={f.id}>
            <Status state={f.status} />
            <div className="list-main">
              <div className="list-title">{caseTitle(data, f.caseId)}</div>
              <div className="list-meta"><span>{f.type}</span><span>{f.filingCode || 'No filing code'}</span><span>Envelope {f.envelopeNumber || '—'}</span>{f.rejectionReason ? <span style={{ color: 'var(--danger)' }}>{f.rejectionReason}</span> : null}</div>
            </div>
            <div className="row">
              <Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId: f.caseId, section: 'filings' })}>Open</Button>
              {f.status !== 'Draft' && f.status !== 'Staged' ? <Button size="sm" variant="ghost" onClick={() => openDialog('record-result', { filingId: f.id })}>Record result</Button> : null}
              {f.stagedFiles.length ? <Button size="sm" variant="ghost" onClick={() => void download(f)}>Packet</Button> : null}
              {f.status === 'Draft' ? <Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Filing', objectId: f.id })}>Delete</Button> : null}
            </div>
          </div>
        )) : <div className="table-empty">No filings{filter === 'All' ? ' yet' : ` with status ${filter}`}. Open a case and choose Filing &gt; New Filing.</div>}
      </div>
    </div>
  )
}

export function LibraryView() {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('All')
  const authorities = data.authorities
    .filter(a => source === 'All' || a.source === source)
    .filter(a => `${a.caseName} ${a.reporter} ${a.summary}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.caseName.localeCompare(b.caseName))
  return (
    <div className="page">
      <PageHeader title="Library" subtitle="Saved authorities are shared across cases. Notes stay inside each case." actions={<Button variant="primary" icon="add" onClick={() => openDialog('new-authority')}>Add authority</Button>} />
      <div className="filter-bar">
        <div className="search-box"><Icon name="search" /><TextInput placeholder="Search case name, reporter, or summary" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <Select value={source} onChange={e => setSource(e.target.value)} style={{ width: 160 }}><option>All</option><option>Vermont</option><option>CourtListener</option><option>Manual</option></Select>
        <span className="tiny">{authorities.length} authorities</span>
      </div>
      <div className="panel panel-body flush">
        {authorities.length ? authorities.map(auth => (
          <div className="authority-card" key={auth.id}>
            <div className="spread">
              <div>
                <div className="authority-title">{auth.caseName}</div>
                <div className="authority-cite">{auth.reporter} ({auth.year}) · {auth.court}</div>
              </div>
              <Badge tone="outline">{auth.source}</Badge>
            </div>
            <div className="authority-summary">{auth.summary}</div>
            <div className="source-row"><span>{auth.provenance}</span>{auth.cites.length ? <span>· Cites {auth.cites.length} in index</span> : null}</div>
            <div className="authority-actions">
              <Button size="sm" onClick={() => openDialog('save-authority', { authorityId: auth.id })}>Save to case</Button>
              {auth.url ? <Button size="sm" variant="ghost" icon="external" onClick={() => window.open(auth.url, '_blank', 'noopener')}>Open source</Button> : null}
            </div>
          </div>
        )) : <EmptyState icon="book" title="No authority matches" body="Add an authority manually, or populate the Vermont index from published opinions once the source terms are confirmed (OQ-5)." />}
      </div>
    </div>
  )
}

export function TrashView() {
  const { data, restoreTrash, purgeTrash } = useWorkspace()
  const { openDialog, toast } = useUi()
  const groups = useMemo(() => {
    const map = new Map<string, { caption: string; items: typeof data.trash }>()
    for (const item of data.trash) {
      const key = item.caseId || 'other'
      const caption = item.objectType === 'Case' ? item.name : item.caseCaption || caseTitle(data, item.caseId) || 'Not attached to a case'
      const group = map.get(key) || { caption, items: [] }
      group.items.push(item)
      map.set(key, group)
    }
    return Array.from(map.entries())
  }, [data])
  return (
    <div className="page">
      <PageHeader title="Recently Deleted" subtitle={`Items stay for ${data.settings.retentionDays} days. Cases are never removed automatically.`} actions={<Button variant="ghost" onClick={() => navigateTo({ view: 'settings' })}>Retention settings</Button>} />
      {groups.length ? groups.map(([key, group]) => (
        <section className="trash-group" key={key}>
          <div className="trash-group-head"><strong>{group.caption}</strong><span className="tiny">{group.items.length} {group.items.length === 1 ? 'item' : 'items'}</span></div>
          <div className="panel panel-body flush">
            {group.items.map(item => {
              const days = Math.max(0, data.settings.retentionDays - Math.floor((Date.now() - new Date(item.deletedAt).getTime()) / 86_400_000))
              return (
                <div className="trash-item" key={item.id} style={{ padding: '9px 16px' }}>
                  <Icon name={item.objectType === 'Case' ? 'folder' : 'file'} />
                  <div className="list-main"><div className="list-title">{item.name}</div><div className="trash-meta">{item.objectType} · deleted {formatShortDate(item.deletedAt)}{item.references.length ? ` · ${item.references.length} linked document${item.references.length === 1 ? '' : 's'}` : ''}</div></div>
                  <span className="trash-days">{item.objectType === 'Case' ? 'Kept until deleted permanently' : `${days} days left`}</span>
                  <div className="row">
                    <Button size="sm" onClick={() => { restoreTrash(item.id); toast(`Restored “${item.name}”.`, { tone: 'success' }) }}>Restore</Button>
                    <Button size="sm" variant="danger" onClick={() => openDialog('purge', { trashId: item.id })}>Delete permanently</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )) : <EmptyState icon="trash" title="Recently Deleted is empty" body="Deleted documents, exhibits, notes, filings, authorities, deadlines, contacts, and cases wait here. Restore an item to re-link it." />}
    </div>
  )
}
