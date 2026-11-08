import { useCallback, useEffect, useMemo, useState } from 'react'
import { useStore, useWorkspace } from './core/store'
import { useUi, type DialogKind } from './ui/ui'
import { useRouter, navigateTo } from './ui/router'
import { useEditorSelection } from './ui/editorSelection'
import { MenuBar, type MenuGroupDef } from './ui/shell/MenuBar'
import { NavPane } from './ui/shell/NavPane'
import { StatusBar } from './ui/shell/StatusBar'
import { DialogHost } from './ui/DialogHost'
import { ToastHost } from './ui/ToastHost'
import { LoadingScreen, SetupScreen, UnlockScreen } from './views/Session'
import { TodayView, CasesView, CalendarView, FilingQueueView, LibraryView, TrashView } from './views/Global'
import { CaseView } from './views/CaseView'
import { SettingsView, AuditLogView } from './views/Settings'
import { Dialog, Icon, Kbd, TextInput } from './ui/kit'
import { searchWorkspace, type SearchHit } from './core/search'
import { buildDocumentPdf } from './export/pdf'
import { buildDocumentDocx } from './export/docx'
import { downloadBlob, formatDate, safeFilename, todayIso } from './core/util'
import type { Route, RouteSection } from './core/types'

const SECTION_ORDER: RouteSection[] = ['overview', 'documents', 'research', 'exhibits', 'filings', 'deadlines', 'people', 'notes']

export default function App() {
  const { status, bootError } = useStore()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'error') return <LoadingScreen error={bootError} />
  if (status === 'setup') return <SetupScreen />
  if (status === 'locked') return <UnlockScreen />
  return <Workspace />
}

function Workspace() {
  const { route } = useRouter()
  const { openDialog, closeDialog, toast } = useUi()
  const { setSelection } = useEditorSelection()
  const { data, lock, restoreTrash, updateSettings } = useWorkspace()
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [statusHidden, setStatusHidden] = useState(false)
  const [palette, setPalette] = useState(false)
  const [search, setSearch] = useState(false)

  const matter = route.caseId ? data.cases.find(c => c.id === route.caseId && !c.deletedAt) : undefined
  const doc = route.docId ? data.documents.find(d => d.id === route.docId && !d.deletedAt) : undefined

  useEffect(() => {
    const root = document.documentElement
    root.dataset.interfaceSize = data.settings.interfaceScale === 'Large' ? 'large' : 'default'
    root.dataset.motion = data.settings.animations === 'Off' ? 'reduced' : 'full'
  }, [data.settings.interfaceScale, data.settings.animations])

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: DialogKind; payload?: Record<string, unknown> }>).detail
      if (detail?.kind) openDialog(detail.kind, detail.payload || {})
    }
    const undo = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      if (id) { restoreTrash(id); toast('Restored from Recently Deleted.', { tone: 'success' }) }
    }
    window.addEventListener('lmt:open-dialog', open)
    window.addEventListener('lmt:restore-trash', undo)
    return () => {
      window.removeEventListener('lmt:open-dialog', open)
      window.removeEventListener('lmt:restore-trash', undo)
    }
  }, [openDialog, restoreTrash, toast])

  const open = useCallback((kind: DialogKind, payload: Record<string, unknown> = {}) => openDialog(kind, payload), [openDialog])
  const newDocument = useCallback(() => {
    if (matter) open('new-document', { caseId: matter.id })
    else open('new-document')
  }, [matter, open])

  const exportCurrent = useCallback(async (kind: 'pdf' | 'docx') => {
    const matterCase = doc ? data.cases.find(c => c.id === doc.caseId) : undefined
    if (!doc || !matterCase) return toast('Open a draft to export.', { tone: 'danger' })
    try {
      if (kind === 'pdf') {
        const bytes = await buildDocumentPdf(data, matterCase, doc)
        downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), `${safeFilename(doc.title)}.pdf`)
      } else {
        const bytes = await buildDocumentDocx(data, matterCase, doc)
        downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${safeFilename(doc.title)}.docx`)
      }
      toast(`Exported ${kind === 'pdf' ? 'PDF' : 'Word document'}.`, { tone: 'success' })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The export failed.', { tone: 'danger' })
    }
  }, [data, doc, toast])

  const commands = useMemo(() => {
    const list: { label: string; hint?: string; run: () => void }[] = [
      { label: 'New case', hint: 'Ctrl+Shift+N', run: () => open('new-case') },
      { label: 'New document', hint: 'Ctrl+N', run: newDocument },
      { label: 'New filing', hint: 'Ctrl+Alt+F', run: () => matter ? open('new-filing', { caseId: matter.id }) : navigateTo({ view: 'queue' }) },
      { label: 'Citation Scan', run: () => doc ? open('citation-scan', { docId: doc.id }) : toast('Open a draft first.') },
      { label: 'Quick Check', run: () => doc ? open('quick-check', { docId: doc.id }) : toast('Open a draft first.') },
      { label: 'Deadline Rules', run: () => open('deadline-rules') },
      { label: 'Audit Log', run: () => navigateTo({ view: 'audit' }) },
      { label: 'Options', run: () => navigateTo({ view: 'settings' }) },
      { label: 'Recently Deleted', run: () => navigateTo({ view: 'trash' }) },
      { label: 'Filing Queue', run: () => navigateTo({ view: 'queue' }) },
      { label: 'Library', run: () => navigateTo({ view: 'library' }) },
      { label: 'Backup now', run: () => open('backup') },
      { label: 'Export as PDF', run: () => void exportCurrent('pdf') },
      { label: 'Export as Word', run: () => void exportCurrent('docx') },
      { label: 'Lock workspace', run: () => void lock() },
      { label: 'Keyboard shortcuts', run: () => open('shortcuts') },
    ]
    if (matter) list.unshift(...SECTION_ORDER.map((section, index) => ({ label: `Go to ${section[0].toUpperCase()}${section.slice(1)}`, hint: `Ctrl+${index + 1}`, run: () => navigateTo({ view: 'case', caseId: matter.id, section }) })))
    return list
  }, [matter, doc, newDocument, open, exportCurrent, toast, lock])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); setPalette(true); return }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); setSearch(true); return }
      if (mod && event.shiftKey && event.key.toLowerCase() === 'n') { event.preventDefault(); open('new-case'); return }
      if (mod && !event.shiftKey && event.key.toLowerCase() === 'n' && !typing) { event.preventDefault(); newDocument(); return }
      if (mod && event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); if (matter) open('new-filing', { caseId: matter.id }); return }
      if (mod && event.altKey && event.key.toLowerCase() === 'p') { event.preventDefault(); const filing = matter && data.filings.find(f => f.caseId === matter.id); if (filing) open('preflight', { filingId: filing.id }); return }
      if (mod && event.altKey && event.key.toLowerCase() === 'n') { event.preventDefault(); setNavCollapsed(v => !v); return }
      if (mod && !event.shiftKey && !event.altKey && /^[1-8]$/.test(event.key) && matter && !typing) {
        event.preventDefault()
        navigateTo({ view: 'case', caseId: matter.id, section: SECTION_ORDER[Number(event.key) - 1] })
      }
      if (event.key === 'Escape') { setPalette(false); setSearch(false); setSelection(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data.filings, matter, newDocument, open, setSelection])

  const menus: MenuGroupDef[] = [
    { label: 'File', items: [
      { label: 'New Case', shortcut: 'Ctrl+Shift+N', action: () => open('new-case') },
      { label: 'New Document', shortcut: 'Ctrl+N', action: newDocument },
      { label: 'Open', shortcut: 'Ctrl+Shift+P', action: () => setPalette(true) },
      { label: 'Close Case', action: () => navigateTo({ view: 'cases' }), disabled: !matter, disabledReason: 'No case is open.' },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true })), disabled: !doc, disabledReason: 'Open a draft to save.' },
      { label: 'Export as PDF', action: () => void exportCurrent('pdf'), disabled: !doc, disabledReason: 'Open a draft to export.' },
      { label: 'Export as Word', action: () => void exportCurrent('docx'), disabled: !doc, disabledReason: 'Open a draft to export.' },
      { label: 'Print', shortcut: 'Ctrl+P', action: () => window.print(), disabled: !doc, disabledReason: 'Open a draft to print.' },
      { separator: true },
      { label: 'Backup Now', action: () => open('backup') },
      { label: 'Restore from Backup', action: () => open('backup', { restore: true }) },
      { separator: true },
      { label: 'Lock Workspace', action: () => void lock() },
    ] },
    { label: 'Edit', items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
      { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
      { separator: true },
      { label: 'Find', shortcut: 'Ctrl+F', action: () => doc ? open('find-replace', { docId: doc.id, mode: 'find' }) : toast('Open a draft first.') },
      { label: 'Replace', shortcut: 'Ctrl+H', action: () => doc ? open('find-replace', { docId: doc.id, mode: 'replace' }) : toast('Open a draft first.') },
      { label: 'Find Across Case', shortcut: 'Ctrl+Shift+F', action: () => setSearch(true) },
      { label: 'Delete', shortcut: 'Delete', action: () => {
        if (doc) open('delete-confirm', { objectType: 'Document', objectId: doc.id })
        else if (matter) open('delete-confirm', { objectType: 'Case', objectId: matter.id })
        else toast('Select a case or draft to delete.')
      }, disabled: !matter },
    ] },
    { label: 'View', items: [
      { label: 'Navigation Pane', shortcut: 'Ctrl+Alt+N', checked: !navCollapsed, action: () => setNavCollapsed(v => !v) },
      { label: 'Status Bar', checked: !statusHidden, action: () => setStatusHidden(v => !v) },
      { label: 'Full Screen', action: () => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen() } },
      { separator: true },
      { label: 'Large Interface', checked: data.settings.interfaceScale === 'Large', action: () => updateSettings({ interfaceScale: data.settings.interfaceScale === 'Large' ? 'Default' : 'Large' }) },
    ] },
    { label: 'Matter', items: [
      ...SECTION_ORDER.map((section, index) => ({ label: section[0].toUpperCase() + section.slice(1), shortcut: `Ctrl+${index + 1}`, action: () => matter ? navigateTo({ view: 'case', caseId: matter.id, section }) : toast('Open a case first.'), disabled: !matter })),
      { separator: true },
      { label: 'Edit Case', action: () => matter ? open('edit-case', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Trigger Event', action: () => matter ? open('trigger-event', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Archive Case', action: () => matter ? open('edit-case', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Delete Case', danger: true, action: () => matter ? open('delete-confirm', { objectType: 'Case', objectId: matter.id }) : undefined, disabled: !matter },
    ] },
    { label: 'Research', items: [
      { label: 'Search Opinions', shortcut: 'Ctrl+Shift+F', action: () => setSearch(true) },
      { label: 'Add Authority', action: () => open('new-authority', matter ? { caseId: matter.id } : {}) },
      { label: 'Cite Selected Text', shortcut: 'Ctrl+Shift+A', action: () => doc ? open('cite', { docId: doc.id, caseId: doc.caseId }) : toast('Open a draft first.'), disabled: !doc },
      { label: 'Mark Citation Verified', action: () => doc ? open('mark-verified', { docId: doc.id }) : toast('Open a draft first.'), disabled: !doc },
      { label: 'Citation Scan', action: () => doc ? open('citation-scan', { docId: doc.id }) : toast('Open a draft first.'), disabled: !doc },
      { separator: true },
      { label: 'Quick Check (v1.1)', action: () => doc ? open('quick-check', { docId: doc.id }) : toast('Open a draft first.'), disabled: !doc },
      { label: 'Citing References (v1.1)', action: () => open('deferred', { title: 'Citing References', body: 'Planned for version 1.1. This will list later cases in the local index that cite a saved case, as a lookup aid rather than a treatment analysis.' }) },
      { label: 'Outline (v1.1)', action: () => open('deferred', { title: 'Outline', body: 'Planned for version 1.1. This will let you arrange saved passages and headings into an outline while citations stay linked.' }) },
    ] },
    { label: 'Exhibits', items: [
      { label: 'Add Exhibit', action: () => matter ? open('add-exhibit', { caseId: matter.id }) : toast('Open a case first.'), disabled: !matter },
      { label: 'Combine Files', action: () => matter ? open('combine-files', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Organize Pages', action: () => matter ? open('organize-pages', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Bates Numbering', action: () => matter ? open('bates', { caseId: matter.id }) : undefined, disabled: !matter },
      { label: 'Insert Cross-reference', shortcut: 'Ctrl+Shift+E', action: () => doc ? open('exhibit-xref', { docId: doc.id, caseId: doc.caseId }) : toast('Open a draft first.'), disabled: !doc },
      { label: 'Exhibit Index', action: () => matter ? open('exhibit-index', { caseId: matter.id }) : undefined, disabled: !matter },
      { separator: true },
      { label: 'Recognize Text (OCR) (v1.1)', action: () => open('deferred', { title: 'Recognize Text (OCR)', body: 'Local OCR is planned for version 1.1. Scanned exhibits are stored as PDFs today, but their text is not searchable.' }) },
    ] },
    { label: 'Filing', items: [
      { label: 'New Filing', shortcut: 'Ctrl+Alt+F', action: () => matter ? open('new-filing', { caseId: matter.id }) : toast('Open a case first.'), disabled: !matter },
      { label: 'Preflight', shortcut: 'Ctrl+Alt+P', action: () => { const f = matter && data.filings.find(x => x.caseId === matter.id); if (f) open('preflight', { filingId: f.id }); else toast('Create a filing first.') }, disabled: !matter },
      { label: 'Stage Filing', action: () => { const f = matter && data.filings.find(x => x.caseId === matter.id && (x.status === 'Draft' || x.status === 'Staged')); if (f) open('stage-filing', { filingId: f.id }); else toast('Create a filing draft first.') }, disabled: !matter },
      { label: 'Open eFile & Serve', action: () => window.open(data.settings.efileUrl, '_blank', 'noopener') },
      { label: 'Record Filing Result', action: () => { const f = matter && data.filings.find(x => x.caseId === matter.id); if (f) open('record-result', { filingId: f.id }); else toast('Create a filing first.') }, disabled: !matter },
      { separator: true },
      { label: 'Filing Queue', action: () => navigateTo({ view: 'queue' }) },
      { label: 'Service Contacts', action: () => matter ? open('service-contacts', { caseId: matter.id }) : undefined, disabled: !matter },
    ] },
    { label: 'Tools', items: [
      { label: 'Deadline Rules', action: () => open('deadline-rules') },
      { label: 'Citation Scan', action: () => doc ? open('citation-scan', { docId: doc.id }) : toast('Open a draft first.') },
      { label: 'Audit Log', action: () => navigateTo({ view: 'audit' }) },
      { label: 'Recently Deleted Retention', action: () => navigateTo({ view: 'settings' }) },
      { label: 'Backups', action: () => open('backup') },
    ] },
    { label: 'Options', items: [
      { label: 'Approved Services', action: () => navigateTo({ view: 'settings' }) },
      { label: 'Recently Deleted Retention', action: () => navigateTo({ view: 'settings' }) },
      { label: 'Backups', action: () => open('backup') },
      { label: 'Interface Size', checked: data.settings.interfaceScale === 'Large', action: () => updateSettings({ interfaceScale: data.settings.interfaceScale === 'Large' ? 'Default' : 'Large' }) },
      { label: 'Shortcuts', action: () => open('shortcuts') },
    ] },
    { label: 'Help', items: [
      { label: 'Help Topics', action: () => open('help') },
      { label: 'Keyboard Shortcuts', action: () => open('shortcuts') },
      { label: 'Check for Updates', action: () => toast('Version 1.0. This build does not contact an update service.', { tone: 'info' }) },
      { label: 'About Legal Matter Workspace', action: () => open('about') },
    ] },
  ]

  return (
    <div className="app-shell">
      <MenuBar menus={menus} />
      <div className="workspace">
        <NavPane route={route as Route} collapsed={navCollapsed} onOpenDialog={kind => open(kind)} />
        <main className="main-pane" onClick={() => setSelection(null)}>
          <RouteView route={route as Route} />
        </main>
      </div>
      <StatusBar route={route as Route} hidden={statusHidden} />
      <DialogHost />
      <ToastHost />
      {palette ? <Palette commands={commands} onClose={() => setPalette(false)} /> : null}
      {search ? <SearchOverlay caseId={matter?.id} onClose={() => setSearch(false)} /> : null}
    </div>
  )
}

function RouteView({ route }: { route: Route }) {
  switch (route.view) {
    case 'case': return <CaseView route={route} />
    case 'cases': return <CasesView />
    case 'calendar': return <CalendarView />
    case 'queue': return <FilingQueueView />
    case 'library': return <LibraryView />
    case 'trash': return <TrashView />
    case 'settings': return <SettingsView />
    case 'audit': return <AuditLogView />
    default: return <TodayView />
  }
}

function Palette({ commands, onClose }: { commands: { label: string; hint?: string; run: () => void }[]; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
  return <Dialog title="Command search" subtitle="Type a command. Enter runs the first result." onClose={onClose} width="620px">
    <TextInput autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="What do you want to do?" onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) { onClose(); filtered[0].run() } }} />
    <div className="palette-list" style={{ marginTop: 8 }}>{filtered.map(command => <button key={command.label} className="list-row" onClick={() => { onClose(); command.run() }}><span className="list-title">{command.label}</span>{command.hint ? <Kbd>{command.hint}</Kbd> : null}</button>)}</div>
    {!filtered.length ? <div className="table-empty">No matching command.</div> : null}
  </Dialog>
}

function SearchOverlay({ caseId, onClose }: { caseId?: string; onClose: () => void }) {
  const { data } = useWorkspace()
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchWorkspace(data, query, caseId), [data, query, caseId])
  const go = (hit: SearchHit) => { onClose(); window.location.hash = hit.route }
  return <Dialog title="Find across the workspace" subtitle={caseId ? 'Searching this case' : 'Searching all cases'} onClose={onClose} width="720px">
    <TextInput autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search drafts, notes, authorities, exhibits, people, filings, and cases" />
    <div style={{ marginTop: 10, maxHeight: 360, overflowY: 'auto' }}>{hits.map(hit => <button className="list-row" key={`${hit.kind}-${hit.id}`} onClick={() => go(hit)} style={{ width: '100%', textAlign: 'left' }}><span className="list-main"><span className="list-title">{hit.title}</span><span className="list-meta"><span>{hit.kind}</span>{hit.caseCaption ? <span>{hit.caseCaption}</span> : null}{hit.snippet ? <span>{hit.snippet}</span> : null}</span></span><Icon name="search" size={14} /></button>)}</div>
    {query.length < 2 ? <div className="tiny">Type at least two characters.</div> : null}
    {query.length >= 2 && !hits.length ? <div className="table-empty">Nothing found.</div> : null}
  </Dialog>
}
