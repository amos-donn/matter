import { useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from '../ui/ui'
import { navigateTo } from '../ui/router'
import { Badge, Button, EmptyState, Icon, PageHeader, Status, Tabs, TextInput } from '../ui/kit'
import { caseDeadlines, deadlineDate, deadlineState, nextDeadline } from '../core/deadlines'
import { countExhibitReferences, citationAge, citeDisplay, scanDocument, tableOfAuthorities } from '../core/citations'
import { daysFromToday, formatShortDate } from '../core/util'
import { caseDocs, caseLinks, fullAddress } from '../ui/helpers'
import { FilingsSection } from './Filings'
import { Editor } from './Editor'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'research', label: 'Research' },
  { id: 'exhibits', label: 'Exhibits' },
  { id: 'filings', label: 'Filings' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'people', label: 'People' },
  { id: 'notes', label: 'Notes' },
]

export function CaseView({ route }: { route: import('../core/types').Route }) {
  const { data } = useWorkspace()
  const { openDialog, toast } = useUi()
  const matter = data.cases.find(c => c.id === route.caseId && !c.deletedAt)
  const [query, setQuery] = useState('')
  if (!matter) return <div className="page"><EmptyState icon="folder" title="That case was not found" body="It may have been moved to Recently Deleted." action={<Button onClick={() => navigateTo({ view: 'cases' })}>All cases</Button>} /></div>
  const doc = route.docId ? data.documents.find(d => d.id === route.docId && !d.deletedAt) : undefined
  if (route.section === 'documents' && doc) {
    return <Editor docId={doc.id} />
  }
  const next = nextDeadline(data, matter.id)

  return (
    <div className="page">
      <header className="case-hero">
        <div className="spread" style={{ alignItems: 'flex-start' }}>
          <div><div className="page-title-row"><h1>{matter.caption}</h1><Status state={matter.status} /></div><div className="case-hero-meta"><span>{matter.court}</span><span>No. {matter.number || '—'}</span><span>Role: {matter.role}</span>{matter.clientId ? <span>Client ID {matter.clientId}</span> : null}{matter.judge ? <span>Judge {matter.judge}</span> : null}</div></div>
          <div className="row-wrap">
            <Button variant="primary" icon="add" onClick={() => openDialog('new-document', { caseId: matter.id })}>New document</Button>
          </div>
        </div>
        <div className="case-hero-actions">
          <span className={`case-deadline ${next?.override ? '' : next && deadlineState(next) === 'Overdue' ? 'overdue' : next && deadlineState(next) === 'Due Soon' ? 'due' : ''}`}><Icon name="clock" size={14} />{next ? `${next.title} · ${formatShortDate(deadlineDate(next))} · ${daysFromToday(deadlineDate(next)) >= 0 ? `in ${daysFromToday(deadlineDate(next))} days` : 'overdue'}` : 'No upcoming deadline'}</span>
          <Button size="sm" variant="ghost" onClick={() => openDialog('edit-case', { caseId: matter.id })}>Edit case</Button>
          <Button size="sm" variant="ghost" onClick={() => openDialog('trigger-event', { caseId: matter.id })}>Trigger event</Button>
          <Button size="sm" variant="ghost" onClick={() => openDialog('new-filing', { caseId: matter.id })}>New filing</Button>
          <Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Case', objectId: matter.id })}>Delete case</Button>
        </div>
      </header>

      <Tabs tabs={TABS.map(t => ({ id: t.id, label: t.label }))} active={route.section || 'overview'} onChange={id => navigateTo({ view: 'case', caseId: matter.id, section: id as import('../core/types').RouteSection })} label="Case sections" />

      <div style={{ marginTop: 16 }}>
        {(!route.section || route.section === 'overview') && <Overview caseId={matter.id} />}
        {route.section === 'documents' && <Documents caseId={matter.id} />}
        {route.section === 'research' && <Research caseId={matter.id} />}
        {route.section === 'exhibits' && <Exhibits caseId={matter.id} />}
        {route.section === 'filings' && <FilingsSection caseId={matter.id} />}
        {route.section === 'deadlines' && <Deadlines caseId={matter.id} />}
        {route.section === 'people' && <People caseId={matter.id} />}
        {route.section === 'notes' && <Notes caseId={matter.id} />}
      </div>
      {route.section === 'documents' && !doc ? (
        <div className="row" style={{ marginTop: 12 }}>
          <div className="search-box"><Icon name="search" /><TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a draft" /></div>
          <span className="tiny">Choose a draft above, or create one from a template.</span>
        </div>
      ) : null}
    </div>
  )
}

function Overview({ caseId }: { caseId: string }) {
  const { data } = useWorkspace()
  const matter = data.cases.find(c => c.id === caseId)!
  const deadlines = caseDeadlines(data, caseId).slice(0, 4)
  const docs = caseDocs(data, caseId).slice(0, 4)
  const links = caseLinks(data, caseId)
  const filings = data.filings.filter(f => f.caseId === caseId)
  const notes = data.notes.filter(n => n.caseId === caseId && !n.deletedAt).slice(0, 3)
  return (
    <div className="two-col">
      <div>
        <div className="panel"><div className="panel-head"><div className="panel-title"><Icon name="clock" /> Deadlines</div><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId, section: 'deadlines' })}>All deadlines</Button></div>
          {deadlines.length ? deadlines.map(d => <div className="list-row" key={d.id}><Status state={deadlineState(d)} /><div className="list-main"><div className="list-title">{d.title}</div><div className="list-meta"><span>{formatShortDate(deadlineDate(d))}</span><span>{d.triggerLabel}</span><span>{d.override ? `Overridden: ${d.override.reason}` : data.rules.find(r => r.id === d.ruleId)?.ruleRef}</span></div></div></div>) : <div className="table-empty">No deadlines. Set a trigger event to calculate them.</div>}
        </div>
        <div className="panel"><div className="panel-head"><div className="panel-title"><Icon name="file" /> Drafts</div><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId, section: 'documents' })}>All documents</Button></div>
          {docs.length ? docs.map(d => { const issues = scanDocument(data, d).findings.filter(f => f.severity === 'error').length; return <div className="list-row" key={d.id}><div className="list-main"><div className="list-title">{d.title}</div><div className="list-meta"><span>{d.kind}</span><span>Updated {formatShortDate(d.updatedAt)}</span>{issues ? <Badge tone="danger">{issues} issues</Badge> : null}</div></div><Button size="sm" onClick={() => navigateTo({ view: 'case', caseId, section: 'documents', docId: d.id })}>Open</Button></div> }) : <div className="table-empty">No drafts yet.</div>}
        </div>
      </div>
      <div>
        <div className="panel"><div className="panel-head"><div className="panel-title"><Icon name="users" /> People</div><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId, section: 'people' })}>Open</Button></div>
          {links.length ? links.slice(0, 4).map(({ link, contact }) => <div className="list-row" key={link.id}><div className="list-main"><div className="list-title">{contact.name}</div><div className="list-meta"><span>{link.roles.join(', ') || 'Contact'}</span>{link.service ? <Badge tone="info">Service</Badge> : null}</div></div></div>) : <div className="table-empty">No parties or counsel yet.</div>}
        </div>
        <div className="panel"><div className="panel-head"><div className="panel-title"><Icon name="filing" /> Filings</div><Button size="sm" variant="ghost" onClick={() => openDialogSafe('new-filing', { caseId })}>New filing</Button></div>
          {filings.length ? filings.slice(0, 4).map(f => <div className="list-row" key={f.id}><Status state={f.status} /><div className="list-main"><div className="list-title">{f.filingCode || 'Filing draft'}</div><div className="list-meta"><span>{f.type}</span></div></div><Button size="sm" onClick={() => navigateTo({ view: 'case', caseId, section: 'filings' })}>Open</Button></div>) : <div className="table-empty">No filings.</div>}
        </div>
        <div className="panel"><div className="panel-head"><div className="panel-title"><Icon name="note" /> Notes</div><Button size="sm" variant="ghost" onClick={() => openDialogSafe('note', { caseId })}>New note</Button></div>
          {notes.length ? notes.map(n => <div className="list-row" key={n.id}><div className="list-main"><div className="list-title">{n.title}</div><div className="list-meta"><span>{formatShortDate(n.updatedAt)}</span></div></div></div>) : <div className="table-empty">No notes.</div>}
        </div>
      </div>
    </div>
  )
}

function openDialogSafe(kind: import('../ui/ui').DialogKind, payload: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('lmt:open-dialog', { detail: { kind, payload } }))
}

function Documents({ caseId }: { caseId: string }) {
  const { data } = useWorkspace()
  const { openDialog, toast } = useUi()
  const docs = caseDocs(data, caseId)
  const [query, setQuery] = useState('')
  const filtered = docs.filter(d => d.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="panel panel-body flush">
      <div className="panel-head"><div className="panel-title">{docs.length} documents</div><div className="row"><div className="search-box" style={{ minWidth: 200 }}><Icon name="search" /><TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a draft" /></div><Button size="sm" variant="primary" icon="add" onClick={() => openDialog('new-document', { caseId })}>New document</Button></div></div>
      {filtered.length ? (
        <table className="data-table"><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Updated</th><th>Issues</th><th /></tr></thead><tbody>
          {filtered.map(d => { const issues = scanDocument(data, d).findings.filter(f => f.severity === 'error').length; return (
            <tr key={d.id}>
              <td><button className="linkish" style={{ fontWeight: 600, textDecoration: 'none' }} onClick={() => navigateTo({ view: 'case', caseId, section: 'documents', docId: d.id })}>{d.title}</button></td>
              <td>{d.kind}</td><td><Status state={d.status} /></td><td className="tabular">{formatShortDate(d.updatedAt)}</td>
              <td>{issues ? <Badge tone="danger">{issues}</Badge> : <Badge tone="success">Clear</Badge>}</td>
              <td className="actions"><div className="row-actions"><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId, section: 'documents', docId: d.id })}>Open</Button><Button size="sm" variant="ghost" onClick={() => openDialog('history', { docId: d.id })}>History</Button><Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Document', objectId: d.id })}>Delete</Button></div></td>
            </tr>
          ) })}
        </tbody></table>
      ) : <EmptyState icon="file" title="No drafts yet" body="Start from a template: appellate brief, motion, statement of questions, table of contents, table of authorities, or certificate of service." action={<Button variant="primary" icon="add" onClick={() => openDialog('new-document', { caseId })}>New document</Button>} />}
    </div>
  )
}

function Research({ caseId }: { caseId: string }) {
  const { data, removeAuthorityFromCase, markCitation } = useWorkspace()
  const { openDialog, toast } = useUi()
  const saved = data.caseAuthorities.filter(l => l.caseId === caseId)
  const citations = data.citations.filter(c => c.caseId === caseId)
  const [query, setQuery] = useState('')
  const results = data.authorities.filter(a => `${a.caseName} ${a.reporter} ${a.summary}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
  const doc = caseDocs(data, caseId).find(d => d.blocks.some(b => b.type === 'paragraph')) || caseDocs(data, caseId)[0]
  return (
    <div className="research-grid">
      <div className="panel">
        <div className="panel-head"><div className="panel-title"><Icon name="book" /> Saved authorities</div><Button size="sm" variant="ghost" onClick={() => openDialog('new-authority', { caseId })}>Add authority</Button></div>
        {saved.length ? saved.map(link => {
          const auth = data.authorities.find(a => a.id === link.authorityId)
          if (!auth) return <div className="authority-card" key={link.id}><div className="authority-title">Authority missing</div><div className="tiny">The record was removed. Restore it from Recently Deleted or replace the citation.</div></div>
          const citing = data.authorities.filter(a => a.cites.includes(auth.id))
          const cite = citations.find(c => c.authorityId === auth.id)
          return (
            <div className="authority-card" key={link.id}>
              <div className="spread"><div><div className="authority-title">{auth.caseName}</div><div className="authority-cite">{auth.reporter} ({auth.year}) · {auth.court}</div></div>{cite ? <Status state={cite.status} /> : <Badge tone="outline">No citation link</Badge>}</div>
              <div className="authority-summary">{auth.summary}</div>
              <div className="source-row"><span>{auth.provenance}</span>{auth.url ? <button className="linkish" onClick={() => window.open(auth.url, '_blank', 'noopener')}>Open source</button> : null}</div>
              {link.note ? <div className="authority-note">{link.note}</div> : null}
              {citing.length ? <div className="citing-refs"><div className="tiny">Citing references in the index (lookup aid, not treatment)</div>{citing.slice(0, 4).map(c => <div className="citing-ref" key={c.id}>{c.caseName}, {c.reporter}</div>)}</div> : null}
              <div className="authority-actions">
                {doc ? <Button size="sm" onClick={() => openDialog('cite', { caseId, docId: doc.id, authorityId: auth.id })}>Cite in draft</Button> : null}
                {cite ? <Button size="sm" variant="ghost" onClick={() => openDialog('mark-verified', { citationId: cite.id })}>{cite.status === 'Verified' ? 'Update status' : 'Mark verified'}</Button> : null}
                <Button size="sm" variant="ghost" onClick={() => openDialog('save-authority', { authorityId: auth.id, caseId })}>Edit note</Button>
                <Button size="sm" variant="ghost" onClick={() => { removeAuthorityFromCase(link.id); toast('Authority removed from this case. The library record is kept.') }}>Remove from case</Button>
              </div>
            </div>
          )
        }) : <EmptyState icon="book" title="No saved authorities" body="Save an authority from the Library or add one manually. Notes are kept per case." action={<Button onClick={() => openDialog('new-authority', { caseId })}>Add authority</Button>} />}
      </div>
      <div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title"><Icon name="search" /> Search the library</div><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'library' })}>Open Library</Button></div>
          <div style={{ padding: 12 }}><div className="search-box" style={{ maxWidth: 'none' }}><Icon name="search" /><TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Case name, reporter, or subject" /></div></div>
          {results.map(auth => (
            <div className="authority-card" key={auth.id}>
              <div className="authority-title">{auth.caseName}</div><div className="authority-cite">{auth.reporter} ({auth.year})</div>
              <div className="authority-summary">{auth.summary}</div>
              <div className="authority-actions"><Button size="sm" onClick={() => openDialog('save-authority', { authorityId: auth.id, caseId })}>Save to case</Button>{doc ? <Button size="sm" variant="ghost" onClick={() => openDialog('cite', { caseId, docId: doc.id, authorityId: auth.id })}>Cite</Button> : null}</div>
            </div>
          ))}
          {!results.length ? <div className="table-empty">No authority matches.</div> : null}
          <div className="panel-body" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="tiny">Vermont opinions are not indexed yet (OQ-5). CourtListener is off until approved in Options &gt; Approved Services.</div>
            <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => openDialog('deferred', { title: 'Search opinions', body: 'The Vermont opinion index is populated from published opinions once terms and format are confirmed (OQ-5). CourtListener search requires an approved service and API token under Options > Approved Services.' })}>Search opinions</Button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div className="panel-title"><Icon name="cite" /> Citation records</div></div>
          {citations.length ? citations.map(c => { const auth = data.authorities.find(a => a.id === c.authorityId); const shown = citeDisplay(data, c.id, c.pinpoint); return (
            <div className="list-row" key={c.id}>
              <Status state={c.status} />
              <div className="list-main"><div className="list-title">{auth?.caseName || 'Authority missing'}</div><div className="list-meta"><span>{shown.text}</span><span>{citationAge(c)}</span>{c.note ? <span>{c.note}</span> : null}</div></div>
              <Button size="sm" variant="ghost" onClick={() => openDialog('mark-verified', { citationId: c.id })}>Status</Button>
              {c.status !== 'Flagged' ? <Button size="sm" variant="ghost" onClick={() => openDialog('flag-citation', { citationId: c.id })}>Flag</Button> : null}
            </div>
          ) }) : <div className="table-empty">No citations yet. Use References &gt; Cite in a draft.</div>}
        </div>
      </div>
    </div>
  )
}

function Exhibits({ caseId }: { caseId: string }) {
  const { data, readFileBytes } = useWorkspace()
  const { openDialog, toast } = useUi()
  const exhibits = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt).sort((a, b) => a.number - b.number)
  const doc = caseDocs(data, caseId)[0]
  return (
    <div className="panel panel-body flush">
      <div className="panel-head"><div className="panel-title">{exhibits.length} exhibits</div><div className="row-wrap">
        <Button size="sm" variant="primary" icon="add" onClick={() => openDialog('add-exhibit', { caseId })}>Add exhibit</Button>
        <Button size="sm" onClick={() => openDialog('combine-files', { caseId })}>Combine Files</Button>
        <Button size="sm" onClick={() => openDialog('organize-pages', { caseId })}>Organize Pages</Button>
        <Button size="sm" onClick={() => openDialog('bates', { caseId })}>Bates Numbering</Button>
        <Button size="sm" onClick={() => openDialog('exhibit-index', { caseId })}>Exhibit Index</Button>
        {doc ? <Button size="sm" onClick={() => openDialog('exhibit-xref', { caseId, docId: doc.id })}>Cross-reference</Button> : null}
      </div></div>
      {exhibits.length ? (
        <table className="data-table exhibit-table"><thead><tr><th>Ex.</th><th>Description</th><th>Pages</th><th>Bates range</th><th>References</th><th>File</th><th /></tr></thead><tbody>
          {exhibits.map(ex => {
            const refs = countExhibitReferences(data, ex.id)
            return (
              <tr key={ex.id}>
                <td className="exhibit-number">{ex.number}</td>
                <td><div className="list-title">{ex.title}</div>{ex.description ? <div className="list-meta">{ex.description}</div> : null}</td>
                <td className="tabular">{ex.pages}</td>
                <td className="bates">{ex.bates ? `${ex.bates.prefix}${String(ex.bates.start).padStart(6, '0')}–${String(ex.bates.end).padStart(6, '0')}` : '—'}</td>
                <td>{refs.length ? <Badge tone="info">{refs.length} doc{refs.length === 1 ? '' : 's'}</Badge> : <span className="tiny">None</span>}</td>
                <td>{ex.fileName ? <Badge tone="success">PDF</Badge> : <Badge tone="warn">No file</Badge>}{ex.hasFormFields ? <Badge tone="outline">Forms</Badge> : null}</td>
                <td className="actions"><div className="row-actions">
                  {ex.fileId ? <Button size="sm" variant="ghost" onClick={() => openDialog('view-exhibit', { exhibitId: ex.id })}>View</Button> : null}
                  <Button size="sm" variant="ghost" onClick={() => openDialog('edit-exhibit', { exhibitId: ex.id })}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Exhibit', objectId: ex.id })}>Delete</Button>
                </div></td>
              </tr>
            )
          })}
        </tbody></table>
      ) : <EmptyState icon="exhibit" title="No exhibits yet" body="Add a PDF, then use Combine Files, Organize Pages, Bates Numbering, and Exhibit Index for the record. Insert cross-references so renumbering updates every reference." action={<Button variant="primary" icon="add" onClick={() => openDialog('add-exhibit', { caseId })}>Add exhibit</Button>} />}
    </div>
  )
}

function Deadlines({ caseId }: { caseId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const items = caseDeadlines(data, caseId)
  return (
    <div className="panel panel-body flush">
      <div className="panel-head"><div className="panel-title">{items.length} deadlines</div><div className="row"><Button size="sm" onClick={() => openDialog('deadline-rules')}>Deadline Rules</Button><Button size="sm" onClick={() => openDialog('add-deadlines', { caseId })}>Add from rule</Button><Button size="sm" variant="ghost" onClick={() => openDialog('trigger-event', { caseId })}>Trigger event</Button></div></div>
      {items.length ? <table className="data-table"><thead><tr><th>Deadline</th><th>Rule</th><th>Trigger</th><th>Computed</th><th>Override</th><th>Status</th><th /></tr></thead><tbody>
        {items.map(d => { const rule = data.rules.find(r => r.id === d.ruleId); return (
          <tr key={d.id}>
            <td><div className="list-title">{d.title}</div></td>
            <td>{rule ? `${rule.ruleRef}` : '—'}</td>
            <td>{d.triggerLabel}<div className="tiny">{formatShortDate(d.triggerDate)}</div></td>
            <td className="tabular">{formatShortDate(d.computedDate)}</td>
            <td>{d.override ? <div><div className="tabular">{formatShortDate(d.override.date)}</div><div className="tiny">{d.override.reason}</div></div> : '—'}</td>
            <td><Status state={deadlineState(d)} /></td>
            <td className="actions"><div className="row-actions"><Button size="sm" variant="ghost" onClick={() => openDialog('override-deadline', { deadlineId: d.id })}>{d.override ? 'Edit override' : 'Override'}</Button><Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Deadline', objectId: d.id })}>Delete</Button></div></td>
          </tr>
        ) })}
      </tbody></table> : <EmptyState icon="clock" title="No deadlines" body="Enter a trigger event date, or add deadlines from a rule. Each deadline records the rule that produced it." action={<Button variant="primary" onClick={() => openDialog('add-deadlines', { caseId })}>Add deadlines</Button>} />}
      <div className="panel-body"><div className="deadline-rule-note"><Icon name="warning" size={13} /> Seed rules are a starting point. Confirm every period and rule reference against the current Vermont Rules of Appellate Procedure before relying on it.</div></div>
    </div>
  )
}

function People({ caseId }: { caseId: string }) {
  const { data, updateCaseContact, removeContactFromCase } = useWorkspace()
  const { openDialog, toast } = useUi()
  const links = caseLinks(data, caseId)
  const [tab, setTab] = useState('all')
  const filtered = links.filter(({ link }) => tab === 'all' || (tab === 'service' ? link.service : link.roles.includes(tab === 'parties' ? 'Party' : 'Counsel')))
  return (
    <div className="panel panel-body flush">
      <div className="panel-head"><div className="panel-title">{links.length} people</div><div className="row"><Button size="sm" variant="primary" icon="add" onClick={() => openDialog('contact', { caseId })}>Add contact</Button><Button size="sm" variant="ghost" onClick={() => openDialog('service-contacts', { caseId })}>Service Contacts</Button></div></div>
      <div className="panel-body" style={{ paddingBottom: 0 }}><Tabs tabs={[{ id: 'all', label: 'All' }, { id: 'parties', label: 'Parties' }, { id: 'counsel', label: 'Counsel' }, { id: 'service', label: 'Service Contacts' }]} active={tab} onChange={setTab} /></div>
      {filtered.length ? filtered.map(({ link, contact }) => (
        <div className="person-row" key={link.id}>
          <div className="list-main">
            <div className="person-name">{contact.name}</div>
            <div className="person-meta">{[contact.organization, link.roles.join(', '), fullAddress(contact), contact.email, contact.phone].filter(Boolean).join(' · ')}</div>
            <div className="row-wrap" style={{ marginTop: 4 }}>{link.roles.map(r => <Badge key={r} tone="outline">{r}</Badge>)}<Badge tone="neutral">{contact.source}</Badge>{!fullAddress(contact) ? <Badge tone="warn">No address</Badge> : null}</div>
          </div>
          <div className="person-actions">
            <label className="service-toggle"><input type="checkbox" checked={link.service} onChange={e => { updateCaseContact(link.id, { service: e.target.checked }); toast(e.target.checked ? 'Contact will receive service.' : 'Service is off for this contact.') }} /> Service</label>
            <Button size="sm" variant="ghost" onClick={() => openDialog('contact', { caseId, linkId: link.id })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => { removeContactFromCase(link.id); toast('Removed from this case. The master record is kept.') }}>Remove</Button>
          </div>
        </div>
      )) : <EmptyState icon="users" title="No contacts in this list" body="Add parties and counsel, then turn Service on for the contacts that receive filings. Removing a contact from a case keeps its history and its master record." action={<Button variant="primary" onClick={() => openDialog('contact', { caseId })}>Add contact</Button>} />}
    </div>
  )
}

function Notes({ caseId }: { caseId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const notes = data.notes.filter(n => n.caseId === caseId && !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <div>
      <div className="spread" style={{ marginBottom: 12 }}><span className="tiny">{notes.length} notes · link notes to drafts, authorities, and exhibits</span><Button size="sm" variant="primary" icon="add" onClick={() => openDialog('note', { caseId })}>New note</Button></div>
      {notes.length ? <div className="note-grid">{notes.map(note => (
        <article className="note-card" key={note.id}>
          <div className="spread"><h3>{note.title}</h3><span className="tiny">{formatShortDate(note.updatedAt)}</span></div>
          <div className="note-body">{note.body}</div>
          {note.links.length ? <div className="note-links">{note.links.map(l => <span className="note-link" key={`${l.type}-${l.id}`}>{l.type}: {l.label}</span>)}</div> : null}
          <div className="row"><Button size="sm" variant="ghost" onClick={() => openDialog('note', { caseId, noteId: note.id })}>Edit</Button><Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Note', objectId: note.id })}>Delete</Button></div>
        </article>
      ))}</div> : <EmptyState icon="note" title="No notes yet" body="Use notes for research trails, record cites, and things to check. Link a note to a draft, an authority, or an exhibit." action={<Button variant="primary" onClick={() => openDialog('note', { caseId })}>New note</Button>} />}
    </div>
  )
}
