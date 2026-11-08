import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from '../ui/ui'
import { useEditorSelection } from '../ui/editorSelection'
import { Badge, Button, Icon, Status, Tabs } from '../ui/kit'
import { navigateTo } from '../ui/router'
import { blockHtml, serializeEditor } from '../ui/editorUtils'
import { scanDocument, citeDisplay, docCitationUses, tableOfAuthorities } from '../core/citations'
import { caseDeadlines, deadlineDate, deadlineState, nextDeadline } from '../core/deadlines'
import { daysFromToday, downloadBlob, formatShortDate, safeFilename, uid } from '../core/util'
import { buildDocumentPdf } from '../export/pdf'
import { buildDocumentDocx } from '../export/docx'
import { caseDocs, caseLinks, fullAddress } from '../ui/helpers'
import type { DocBlock } from '../core/types'

export function Editor({ docId }: { docId: string }) {
  const { data, updateDocument, saveDocumentVersion, update, readFileBytes } = useWorkspace()
  const { openDialog, toast } = useUi()
  const { selection, setSelection } = useEditorSelection()
  const doc = data.documents.find(d => d.id === docId && !d.deletedAt)
  const matter = doc ? data.cases.find(c => c.id === doc.caseId) : undefined
  const [sideOpen, setSideOpen] = useState(true)
  const [sideTab, setSideTab] = useState('authorities')
  const [zoom, setZoom] = useState(100)
  const [selectionToolbar, setSelectionToolbar] = useState<{ top: number; left: number } | null>(null)
  const lastVersion = useRef('')
  useEffect(() => {
    if (doc) update(draft => { draft.audit.unshift({ id: uid('aud'), at: new Date().toISOString(), user: draft.user, action: 'Open', objectType: 'Document', objectId: doc.id, objectName: doc.title }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  useEffect(() => {
    const toggleSide = () => setSideOpen(v => !v)
    const focusBlock = (event: Event) => {
      const blockId = (event as CustomEvent<string>).detail
      const el = document.querySelector(`[data-block-id="${blockId}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        ;(el.querySelector('[contenteditable="true"]') as HTMLElement | null)?.focus()
      }
    }
    window.addEventListener('lmt:toggle-side', toggleSide)
    window.addEventListener('lmt:focus-block', focusBlock)
    return () => {
      window.removeEventListener('lmt:toggle-side', toggleSide)
      window.removeEventListener('lmt:focus-block', focusBlock)
    }
  }, [])

  if (!doc || !matter) return <div className="page"><p>That draft was not found.</p><Button onClick={() => navigateTo({ view: 'cases' })}>All cases</Button></div>
  const next = nextDeadline(data, matter.id)
  const issues = scanDocument(data, doc).findings
  const linked = caseLinks(data, matter.id)

  const setBlocks = (blocks: DocBlock[]) => updateDocument(doc.id, { blocks })
  const replaceBlock = (id: string, text: string) => setBlocks(doc.blocks.map(b => (b.id === id ? { ...b, text } : b)))
  const moveBlock = (id: string, delta: number) => {
    const index = doc.blocks.findIndex(b => b.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= doc.blocks.length) return
    const blocks = [...doc.blocks]
    const [item] = blocks.splice(index, 1)
    blocks.splice(target, 0, item)
    setBlocks(blocks)
  }
  const removeBlock = (id: string) => {
    if (doc.blocks.length <= 1) return toast('A document needs at least one block.')
    setBlocks(doc.blocks.filter(b => b.id !== id))
  }
  const splitBlock = (id: string) => {
    const index = doc.blocks.findIndex(b => b.id === id)
    const blocks = [...doc.blocks]
    const paragraph: DocBlock = { id: uid('blk'), type: 'paragraph', text: '' }
    blocks.splice(index + 1, 0, paragraph)
    setBlocks(blocks)
    setTimeout(() => window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: paragraph.id })), 30)
  }
  const capture = (event: React.SyntheticEvent) => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) {
      setSelection(null)
      setSelectionToolbar(null)
      return
    }
    let node: Node | null = sel.anchorNode
    while (node && !(node instanceof HTMLElement && node.dataset.blockId)) node = node.parentNode
    if (!(node instanceof HTMLElement)) return
    setSelection({ docId: doc.id, blockId: node.dataset.blockId!, text: sel.toString() })
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setSelectionToolbar({ top: Math.max(80, rect.top - 8), left: rect.left + rect.width / 2 })
    ;(event.currentTarget as HTMLElement).dataset.lastBlock = node.dataset.blockId
  }

  const exportPdf = async () => {
    try {
      const bytes = await buildDocumentPdf(data, matter, doc)
      downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), `${safeFilename(doc.title)}.pdf`)
      update(draft => { draft.audit.unshift({ id: uid('aud'), at: new Date().toISOString(), user: draft.user, action: 'Export', objectType: 'Document', objectId: doc.id, objectName: doc.title, detail: 'PDF' }) })
      toast('PDF exported.', { tone: 'success' })
    } catch (error) { toast(error instanceof Error ? error.message : 'The PDF could not be exported.', { tone: 'danger' }) }
  }
  const exportWord = async () => {
    try {
      const bytes = await buildDocumentDocx(data, matter, doc)
      downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), `${safeFilename(doc.title)}.docx`)
      update(draft => { draft.audit.unshift({ id: uid('aud'), at: new Date().toISOString(), user: draft.user, action: 'Export', objectType: 'Document', objectId: doc.id, objectName: doc.title, detail: 'Word' }) })
      toast('Word document exported.', { tone: 'success' })
    } catch (error) { toast(error instanceof Error ? error.message : 'The Word file could not be exported.', { tone: 'danger' }) }
  }

  return (
    <div className="editor-shell" onKeyDown={e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDocumentVersion(doc.id, 'Manual save'); toast('Version saved.', { tone: 'success' }) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); openDialog('find-replace', { docId: doc.id }) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') { e.preventDefault(); openDialog('find-replace', { docId: doc.id, replace: true }) }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); openDialog('cite', { docId: doc.id, caseId: doc.caseId }) }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); openDialog('exhibit-xref', { docId: doc.id, caseId: doc.caseId }) }
    }}>
      <div className="editor-topbar">
        <Button size="sm" variant="ghost" icon="back" onClick={() => navigateTo({ view: 'case', caseId: doc.caseId, section: 'documents' })}>Documents</Button>
        <input className="input doc-title-input" aria-label="Document title" value={doc.title} onChange={e => updateDocument(doc.id, { title: e.target.value })} />
        <Badge tone="outline">{doc.kind}</Badge>
        {next ? <span className={`editor-deadline ${deadlineState(next) === 'Overdue' ? 'overdue' : deadlineState(next) === 'Due Soon' ? 'due' : ''}`}><Icon name="clock" size={13} />{next.title} {daysFromToday(deadlineDate(next)) >= 0 ? `in ${daysFromToday(deadlineDate(next))} days` : 'overdue'}</span> : null}
        <span className="grow" />
        <Button size="sm" variant="ghost" onClick={() => openDialog('history', { docId: doc.id })}>History</Button>
        <Button size="sm" variant="ghost" onClick={() => openDialog('quick-check', { docId: doc.id })}>Quick Check</Button>
        <Button size="sm" onClick={() => void exportWord()}>Export Word</Button>
        <Button size="sm" variant="primary" onClick={() => void exportPdf()}>Export PDF</Button>
      </div>
      <div className="editor-body">
        <div className="editor-canvas-wrap" onMouseUp={capture} onKeyUp={capture}>
          {selectionToolbar ? (
            <div className="selection-toolbar no-print" style={{ top: selectionToolbar.top, left: selectionToolbar.left }}>
              <button onClick={() => { openDialog('cite', { docId: doc.id, caseId: doc.caseId }); setSelectionToolbar(null) }}>Cite</button>
              <button onClick={() => { openDialog('exhibit-xref', { docId: doc.id, caseId: doc.caseId }); setSelectionToolbar(null) }}>Exhibit</button>
              <button onClick={() => { openDialog('note', { caseId: doc.caseId }); setSelectionToolbar(null) }}>Note</button>
            </div>
          ) : null}
          <div className="editor-canvas">
            <article className="page-sheet" style={{ fontSize: `${13.5 * (zoom / 100)}px` }}>
              {doc.blocks.map((block, index) => {
                if (block.type === 'caption') {
                  const parts = matter.caption.match(/^(.*?)\s+v\.?\s+(.*)$/i)
                  return (
                    <div className="block block-caption" key={block.id} data-block-id={block.id}>
                      <div className="block-controls"><button onClick={() => moveBlock(block.id, -1)} aria-label="Move caption up">↑</button><button onClick={() => moveBlock(block.id, 1)} aria-label="Move caption down">↓</button></div>
                      <div className="doc-caption">
                        <div className="court">{matter.court.toUpperCase()}</div>
                        <div className="docket">Docket No. {matter.number || '—'}</div>
                        {parts ? <><div className="party-line"><span>{parts[1].toUpperCase()}</span><span className="designation">{matter.role},</span></div><div className="versus">v.</div><div className="party-line"><span>{parts[2].toUpperCase()}</span><span className="designation">{matter.role === 'Appellant' ? 'Appellee' : matter.role === 'Appellee' ? 'Appellant' : 'Respondent'},</span></div></> : <div style={{ marginTop: 12 }}>{matter.caption.toUpperCase()}</div>}
                        <div className="caption-rule" />
                        <div className="doc-title">{doc.title.toUpperCase()}</div>
                      </div>
                      <div className="caption-edit-hint">Caption generated from the case. Edit the case to change it.</div>
                      <div className="no-print" style={{ marginTop: 4, textAlign: 'center' }}><button className="btn btn-ghost btn-sm" onClick={() => removeBlock(block.id)}>Remove caption</button></div>
                    </div>
                  )
                }
                if (block.type === 'pagebreak') {
                  return <div className="block block-pagebreak" key={block.id} data-block-id={block.id}><span>Page break</span><div className="block-controls"><button onClick={() => removeBlock(block.id)} aria-label="Remove page break">✕</button></div></div>
                }
                if (['tableOfContents', 'tableOfAuthorities', 'exhibitIndex', 'certificateOfService'].includes(block.type)) {
                  return <GeneratedBlock key={block.id} block={block} docId={doc.id} caseId={doc.caseId} onRemove={() => removeBlock(block.id)} />
                }
                return (
                  <div className={`block block-${block.type}`} key={block.id} data-block-id={block.id} data-level={block.level}>
                    <div className="block-controls">
                      <button onClick={() => moveBlock(block.id, -1)} aria-label="Move block up">↑</button>
                      <button onClick={() => moveBlock(block.id, 1)} aria-label="Move block down">↓</button>
                      <select className="block-style" value={block.type === 'heading' ? `heading${block.level || 1}` : block.type} onChange={e => {
                        const value = e.target.value
                        setBlocks(doc.blocks.map(b => b.id === block.id ? value.startsWith('heading') ? { ...b, type: 'heading', level: Number(value.slice(-1)) as 1 | 2 | 3 } : { ...b, type: value as DocBlock['type'] } : b))
                      }} aria-label="Block style">
                        <option value="paragraph">Body</option><option value="heading1">H1</option><option value="heading2">H2</option><option value="heading3">H3</option><option value="quote">Quote</option>
                      </select>
                      <button onClick={() => removeBlock(block.id)} aria-label="Remove block">✕</button>
                    </div>
                    <EditableBlock
                      html={blockHtml(data, block.text)}
                      className={block.type === 'heading' ? 'block-heading' : block.type === 'quote' ? '' : ''}
                      onInput={text => replaceBlock(block.id, text)}
                      onEnter={() => splitBlock(block.id)}
                    />
                  </div>
                )
              })}
              <div className="editor-insert-row no-print">
                <Button size="sm" variant="ghost" icon="add" onClick={() => setBlocks([...doc.blocks, { id: uid('blk'), type: 'paragraph', text: '' }])}>Paragraph</Button>
                <Button size="sm" variant="ghost" onClick={() => openDialog('cite', { docId: doc.id, caseId: doc.caseId })}>Cite</Button>
                <Button size="sm" variant="ghost" onClick={() => openDialog('exhibit-xref', { docId: doc.id, caseId: doc.caseId })}>Exhibit reference</Button>
                <span className="grow" />
                <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(80, z - 10))}>−</Button>
                <span className="tiny">{zoom}%</span>
                <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(160, z + 10))}>+</Button>
              </div>
              <div className="editor-footer-note">{matter.court} · {matter.number || 'No case number'} · {doc.title} · Saved automatically</div>
            </article>
          </div>
        </div>
        {sideOpen ? (
          <aside className="side-panel" aria-label="Document side panel">
            <div className="side-panel-head">
              <Tabs tabs={[{ id: 'authorities', label: 'Authority' }, { id: 'exhibits', label: 'Exhibits' }, { id: 'notes', label: 'Notes' }, { id: 'issues', label: 'Issues', badge: issues.filter(f => f.severity === 'error').length, tone: 'danger' }]} active={sideTab} onChange={setSideTab} label="Side panel" />
              <button className="icon-btn" aria-label="Close side panel" onClick={() => setSideOpen(false)}><Icon name="close" size={13} /></button>
            </div>
            <div className="side-panel-body">
              {sideTab === 'authorities' ? <SideAuthorities docId={doc.id} caseId={doc.caseId} /> : null}
              {sideTab === 'exhibits' ? <SideExhibits caseId={doc.caseId} docId={doc.id} /> : null}
              {sideTab === 'notes' ? <SideNotes caseId={doc.caseId} /> : null}
              {sideTab === 'issues' ? <SideIssues docId={doc.id} /> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

function EditableBlock({ html, className, onInput, onEnter }: { html: string; className: string; onInput: (value: string) => void; onEnter: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== html) el.innerHTML = html
  }, [html])
  return (
    <div
      ref={ref}
      className={`block-editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      onInput={e => onInput(serializeEditor(e.currentTarget))}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter() }
      }}
      onPaste={e => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
      }}
    />
  )
}

function GeneratedBlock({ block, docId, caseId, onRemove }: { block: DocBlock; docId: string; caseId: string; onRemove: () => void }) {
  const { data } = useWorkspace()
  const doc = data.documents.find(d => d.id === docId)!
  const matter = data.cases.find(c => c.id === caseId)!
  const title = block.type === 'tableOfContents' ? 'Table of contents' : block.type === 'tableOfAuthorities' ? 'Table of authorities' : block.type === 'exhibitIndex' ? 'Exhibit index' : 'Certificate of service'
  const rows: any[] = block.type === 'tableOfAuthorities' ? tableOfAuthorities(data, doc) : block.type === 'tableOfContents' ? doc.blocks.filter(b => b.type === 'heading') : []
  return (
    <div className="block block-generated" data-block-id={block.id}>
      <div className="block-generated-label"><span>Generated · {title}</span><Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button></div>
      {block.type === 'tableOfAuthorities' ? (
        rows.length ? <table className="generated-doc-table"><tbody>{rows.map(row => <tr key={row.authority.id}><td style={{ fontStyle: 'italic' }}>{row.authority.caseName}</td><td>{row.authority.reporter}</td><td>passim</td></tr>)}</tbody></table> : <div className="tiny">No authorities cited yet.</div>
      ) : block.type === 'tableOfContents' ? (
        rows.length ? <ul>{rows.map(row => <li key={row.id} style={{ fontSize: 12 }}>{row.text}</li>)}</ul> : <div className="tiny">No headings yet.</div>
      ) : block.type === 'exhibitIndex' ? (
        <table className="generated-doc-table"><thead><tr><th>Ex.</th><th>Description</th><th>Pages</th></tr></thead><tbody>{data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt).sort((a, b) => a.number - b.number).map(e => <tr key={e.id}><td>{e.number}</td><td>{e.title}</td><td>{e.pages}</td></tr>)}</tbody></table>
      ) : (
        <div className="certificate-preview">
          <p>I certify that on {formatShortDate(new Date().toISOString())}, a copy of this document was served on the following persons through eFile &amp; Serve:</p>
          {caseLinks(data, caseId).filter(x => x.link.service).map(({ contact }) => <p key={contact.id} style={{ marginTop: 6 }}>{contact.name}{fullAddress(contact) ? `, ${fullAddress(contact)}` : ' — no address'}</p>)}
          <div className="sig"><p>Respectfully submitted,</p><p style={{ marginTop: 24, fontWeight: 700 }}>{data.user}</p><p>Counsel for {matter.role}</p></div>
        </div>
      )}
      <div className="tiny" style={{ marginTop: 7 }}>Generated from case data when printed or exported. It is not stored as text.</div>
    </div>
  )
}

function SideAuthorities({ docId, caseId }: { docId: string; caseId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const doc = data.documents.find(d => d.id === docId)!
  const uses = docCitationUses(data, doc)
  const seen = new Set<string>()
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}><Badge tone="outline">{uses.length} in text</Badge><Button size="sm" variant="ghost" onClick={() => openDialog('cite', { docId, caseId })}>Cite</Button></div>
      {uses.map((use, index) => {
        if (seen.has(use.citationId)) return null
        seen.add(use.citationId)
        const shown = citeDisplay(data, use.citationId, use.pinpoint)
        return (
          <div className="side-item" key={use.citationId}>
            <div className="side-item-title">{shown.authority?.caseName || 'Missing authority'}</div>
            <div className="side-item-meta"><Status state={shown.status} />{use.pinpoint ? <span>at {use.pinpoint}</span> : null}</div>
            <div className="side-actions"><Button size="sm" variant="ghost" onClick={() => openDialog('mark-verified', { citationId: use.citationId })}>Mark verified</Button><Button size="sm" variant="ghost" onClick={() => openDialog('flag-citation', { citationId: use.citationId })}>Flag</Button><Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: use.blockId }))}>Find</Button></div>
          </div>
        )
      })}
      {!uses.length ? <div className="tiny">No citations in this draft. Select a sentence and choose Cite, or use References &gt; Cite.</div> : null}
      <div className="divider" />
      <div className="row" style={{ justifyContent: 'space-between' }}><strong className="small">Saved for this case</strong><Button size="sm" variant="ghost" onClick={() => navigateTo({ view: 'case', caseId, section: 'research' })}>Open</Button></div>
      {data.caseAuthorities.filter(l => l.caseId === caseId).slice(0, 8).map(link => {
        const auth = data.authorities.find(a => a.id === link.authorityId)
        return <div className="side-item" key={link.id}><div className="side-item-title">{auth?.caseName || 'Missing'}</div><div className="side-item-meta">{auth?.reporter}</div></div>
      })}
    </div>
  )
}

function SideExhibits({ caseId, docId }: { caseId: string; docId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const exhibits = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt).sort((a, b) => a.number - b.number)
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}><Badge tone="outline">{exhibits.length} in case</Badge><Button size="sm" variant="ghost" onClick={() => openDialog('exhibit-xref', { caseId, docId })}>Insert reference</Button></div>
      {exhibits.map(ex => <div className="side-item" key={ex.id}><div className="side-item-title">Ex. {ex.number} · {ex.title}</div><div className="side-item-meta"><span>{ex.pages} pages</span>{ex.fileId ? <Badge tone="success">PDF</Badge> : <Badge tone="warn">No file</Badge>}</div><div className="side-actions">{ex.fileId ? <Button size="sm" variant="ghost" onClick={() => openDialog('view-exhibit', { exhibitId: ex.id })}>View</Button> : null}<Button size="sm" variant="ghost" onClick={() => openDialog('edit-exhibit', { exhibitId: ex.id })}>Edit</Button></div></div>)}
      {!exhibits.length ? <div className="tiny">No exhibits yet.</div> : null}
    </div>
  )
}

function SideNotes({ caseId }: { caseId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const notes = data.notes.filter(n => n.caseId === caseId && !n.deletedAt)
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}><Badge tone="outline">{notes.length} notes</Badge><Button size="sm" variant="ghost" onClick={() => openDialog('note', { caseId })}>New note</Button></div>
      {notes.map(note => <div className="side-item" key={note.id}><div className="side-item-title">{note.title}</div><div className="side-item-meta">{formatShortDate(note.updatedAt)}</div><div className="authority-note">{note.body.slice(0, 160)}</div></div>)}
      {!notes.length ? <div className="tiny">No notes for this case yet.</div> : null}
    </div>
  )
}

function SideIssues({ docId }: { docId: string }) {
  const { data } = useWorkspace()
  const { openDialog } = useUi()
  const doc = data.documents.find(d => d.id === docId)!
  const scan = scanDocument(data, doc)
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}><Badge tone={scan.issues ? 'danger' : 'success'}>{scan.issues ? `${scan.issues} issues` : 'No issues'}</Badge><Button size="sm" variant="ghost" onClick={() => openDialog('citation-scan', { docId })}>Citation Scan</Button></div>
      {scan.findings.map(finding => <div className={`issue-row ${finding.severity}`} key={finding.id}><div className="issue-title">{finding.title}</div><div className="issue-detail">{finding.detail}</div>{finding.blockId ? <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: finding.blockId }))}>Go to</Button> : null}</div>)}
      {!scan.findings.length ? <div className="tiny">No citation or exhibit reference problems found.</div> : null}
    </div>
  )
}
