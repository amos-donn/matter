import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from './ui'
import { Button, Checkbox, Dialog, Field, Select, Status, TextArea, TextInput } from './kit'
import { navigateTo } from './router'
import { useEditorSelection } from './editorSelection'
import { addDays, deadlinePhrase, downloadBlob, formatDate, formatShortDate, safeFilename, todayIso } from '../core/util'
import { computeDeadlineDate, deadlineDate, rulesForTrigger } from '../core/deadlines'
import { citeDisplay, docCitationUses, scanDocument, citationText } from '../core/citations'
import { insertionToken } from './dialogUtils'
import { getPdfSummary, stampExhibit } from './dialogUtils'
import { runPreflight } from '../core/preflight'
import { savePdfToExhibit, splitExhibit } from './dialogUtils'
import { buildExhibitIndexPdf } from '../export/pdf'
import { PageHeader } from './kit'
import { fetchOpinionText, opinionParagraphs } from '../core/courtlistener'

const S = (value: unknown, fallback = '') => (value === undefined || value === null ? fallback : String(value))
const N = (value: unknown, fallback = 0) => Number(value) || fallback

export function DialogHost() {
  const { dialog, closeDialog } = useUi()
  if (!dialog) return null
  const { kind, payload } = dialog
  const props = { payload, close: closeDialog }
  switch (kind) {
    case 'new-case': return <NewCaseDialog {...props} />
    case 'edit-case': return <EditCaseDialog {...props} />
    case 'trigger-event': return <TriggerDialog {...props} />
    case 'add-deadlines': return <AddDeadlinesDialog {...props} />
    case 'deadline-rules': return <RulesDialog {...props} />
    case 'override-deadline': return <OverrideDeadlineDialog {...props} />
    case 'new-document': return <NewDocumentDialog {...props} />
    case 'cite': return <CiteDialog {...props} />
    case 'mark-verified': return <MarkVerifiedDialog {...props} />
    case 'flag-citation': return <FlagDialog {...props} />
    case 'citation-scan': return <ScanDialog {...props} />
    case 'new-authority': return <NewAuthorityDialog {...props} />
    case 'save-authority': return <SaveAuthorityDialog {...props} />
    case 'opinion-reader': return <OpinionReaderDialog {...props} />
    case 'add-exhibit':
    case 'edit-exhibit': return <ExhibitDialog {...props} edit={kind === 'edit-exhibit'} />
    case 'exhibit-xref': return <XrefDialog {...props} />
    case 'bates': return <BatesDialog {...props} />
    case 'organize-pages': return <OrganizeDialog {...props} />
    case 'combine-files': return <CombineDialog {...props} />
    case 'exhibit-index': return <IndexDialog {...props} />
    case 'view-exhibit': return <ViewExhibitDialog {...props} />
    case 'new-filing':
    case 'edit-filing': return <FilingDialog {...props} edit={kind === 'edit-filing'} />
    case 'stage-filing': return <StageDialog {...props} />
    case 'preflight': return <OverridePreflightDialog {...props} />
    case 'record-result': return <ResultDialog {...props} />
    case 'contact': return <ContactDialog {...props} />
    case 'service-contacts': return <ServiceDialog {...props} />
    case 'note': return <NoteDialog {...props} />
    case 'find-replace': return <FindDialog {...props} />
    case 'history': return <HistoryDialog {...props} />
    case 'compare': return <CompareDialog {...props} />
    case 'quick-check': return <QuickCheckDialog {...props} />
    case 'delete-confirm': return <DeleteDialog {...props} />
    case 'purge': return <PurgeDialog {...props} />
    case 'backup': return <BackupDialog {...props} />
    case 'shortcuts': return <InfoDialog title="Keyboard shortcuts" close={closeDialog} body={<ShortcutTable />} />
    case 'about': return <InfoDialog title="About Legal Matter Workspace" close={closeDialog} body={<AboutBody />} />
    case 'help': return <InfoDialog title="Help topics" close={closeDialog} body={<HelpBody />} />
    case 'deferred': return <InfoDialog title={S(payload.title, 'Planned')} close={closeDialog} body={<p>{S(payload.body)}</p>} />
    default: return <InfoDialog title="Not available in this build" close={closeDialog} body={<p>This command is not wired in this build. The workspace still holds the record.</p>} />
  }
}

function NewCaseDialog({ close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, createCase } = useWorkspace()
  const { toast } = useUi()
  const [caption, setCaption] = useState('')
  const [court, setCourt] = useState('Vermont Supreme Court')
  const [number, setNumber] = useState('')
  const [role, setRole] = useState('Appellant')
  const [clientId, setClientId] = useState('')
  const [judge, setJudge] = useState('')
  const [triggerLabel, setTriggerLabel] = useState('Judgment entered')
  const [triggerDate, setTriggerDate] = useState(todayIso())
  const [parties, setParties] = useState([{ name: '', designation: 'Appellant' }])
  const triggers = Array.from(new Set(data.rules.map(r => r.trigger)))
  const preview = triggerDate ? rulesForTrigger(data.rules, triggerLabel).map(r => ({ name: r.name, date: computeDeadlineDate(triggerDate, r, data.settings.courtHolidays), ref: r.ruleRef })) : []
  const create = () => {
    if (!caption.trim()) return toast('Enter the case caption.', { tone: 'danger' })
    const id = createCase({ caption, court, number, role, clientId, judge, triggerLabel, triggerDate, parties })
    close()
    navigateTo({ view: 'case', caseId: id, section: 'overview' })
    toast('Case created.', { tone: 'success' })
  }
  return (
    <Dialog title="New case" subtitle="The case is the container. Everything else lives inside it." onClose={close} width="720px" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={create}>Create</Button></>}>
      <div className="form-grid">
        <Field label="Caption" required className="span-2"><TextInput value={caption} onChange={e => setCaption(e.target.value)} placeholder="Doe v. State of Vermont" autoFocus /></Field>
        <Field label="Court" required><TextInput value={court} onChange={e => setCourt(e.target.value)} /></Field>
        <Field label="Case number" required><TextInput value={number} onChange={e => setNumber(e.target.value)} placeholder="26-AP-000" /></Field>
        <Field label="Your role"><Select value={role} onChange={e => setRole(e.target.value)}>{['Appellant','Appellee','Petitioner','Respondent','Cross-Appellant','Cross-Appellee','Applicant','Other'].map(r => <option key={r}>{r}</option>)}</Select></Field>
        <Field label="Client ID" hint="Free text, matching Westlaw's term. Groups matters for conflict review."><TextInput value={clientId} onChange={e => setClientId(e.target.value)} /></Field>
        <Field label="Judge"><TextInput value={judge} onChange={e => setJudge(e.target.value)} /></Field>
        <Field label="Trigger event" hint="Deadlines are calculated from this event. Each records its rule."><Select value={triggerLabel} onChange={e => setTriggerLabel(e.target.value)}>{triggers.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Trigger date"><TextInput type="date" value={triggerDate} onChange={e => setTriggerDate(e.target.value)} /></Field>
        <div className="span-2">
          <div className="section-title">Parties</div>
          {parties.map((party, index) => (
            <div className="row" key={index} style={{ marginBottom: 6 }}>
              <TextInput value={party.name} placeholder="Party name" onChange={e => setParties(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} />
              <Select value={party.designation} onChange={e => setParties(prev => prev.map((p, i) => i === index ? { ...p, designation: e.target.value } : p))} style={{ width: 160 }}>{['Appellant','Appellee','Petitioner','Respondent','Cross-Appellant','Cross-Appellee','Applicant','Other'].map(r => <option key={r}>{r}</option>)}</Select>
              <Button size="sm" variant="ghost" onClick={() => setParties(prev => prev.filter((_, i) => i !== index))}>Remove</Button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setParties(prev => [...prev, { name: '', designation: 'Appellee' }])}>Add party</Button>
        </div>
      </div>
      {preview.length ? <div className="panel panel-body"><div className="section-title" style={{ marginTop: 0 }}>Deadlines that will be created</div>{preview.map(p => <div className="row" key={p.name} style={{ justifyContent: 'space-between', padding: '3px 0' }}><span>{p.name} <span className="tiny">{p.ref}</span></span><strong>{formatDate(p.date)}</strong></div>)}<div className="field-hint" style={{ marginTop: 8 }}>Seed rules are a starting point. Confirm each period against the current Vermont Rules of Appellate Procedure.</div></div> : null}
    </Dialog>
  )
}

function EditCaseDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateCase } = useWorkspace()
  const matter = data.cases.find(c => c.id === S(payload.caseId))
  const [caption, setCaption] = useState(matter?.caption || '')
  const [court, setCourt] = useState(matter?.court || '')
  const [number, setNumber] = useState(matter?.number || '')
  const [role, setRole] = useState(matter?.role || 'Appellant')
  const [clientId, setClientId] = useState(matter?.clientId || '')
  const [judge, setJudge] = useState(matter?.judge || '')
  if (!matter) return <InfoDialog title="Case not found" close={close} body={<p>The case may have been moved to Recently Deleted.</p>} />
  return <Dialog title="Edit case" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { updateCase(matter.id, { caption, court, number, role, clientId, judge }); close() }}>Save</Button></>}>
    <div className="form-grid">
      <Field label="Caption" required className="span-2"><TextInput value={caption} onChange={e => setCaption(e.target.value)} /></Field>
      <Field label="Court"><TextInput value={court} onChange={e => setCourt(e.target.value)} /></Field>
      <Field label="Case number"><TextInput value={number} onChange={e => setNumber(e.target.value)} /></Field>
      <Field label="Role"><Select value={role} onChange={e => setRole(e.target.value)}>{['Appellant','Appellee','Petitioner','Respondent','Other'].map(r => <option key={r}>{r}</option>)}</Select></Field>
      <Field label="Client ID"><TextInput value={clientId} onChange={e => setClientId(e.target.value)} /></Field>
      <Field label="Judge"><TextInput value={judge} onChange={e => setJudge(e.target.value)} /></Field>
    </div>
  </Dialog>
}

function TriggerDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateCase } = useWorkspace()
  const matter = data.cases.find(c => c.id === S(payload.caseId))
  const [label, setLabel] = useState(matter?.triggerLabel || '')
  const [date, setDate] = useState(matter?.triggerDate || todayIso())
  if (!matter) return null
  const triggers = Array.from(new Set(data.rules.map(r => r.trigger)))
  const preview = rulesForTrigger(data.rules, label).map(r => ({ rule: r, date: computeDeadlineDate(date, r, data.settings.courtHolidays) }))
  return <Dialog title="Trigger event" subtitle="Changing the trigger recalculates deadlines that are not overridden." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { updateCase(matter.id, { triggerLabel: label, triggerDate: date }, 'Trigger event updated'); close() }}>Save trigger</Button></>}>
    <div className="form-grid"><Field label="Event"><Select value={label} onChange={e => setLabel(e.target.value)}>{triggers.map(t => <option key={t}>{t}</option>)}</Select></Field><Field label="Date"><TextInput type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></div>
    {preview.length ? <div className="panel panel-body">{preview.map(p => <div className="spread" key={p.rule.id}><span>{p.rule.name} <span className="tiny">{p.rule.ruleRef}</span></span><strong>{formatDate(p.date)}</strong></div>)}</div> : null}
  </Dialog>
}

function AddDeadlinesDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, addDeadlinesFromTrigger } = useWorkspace()
  const { toast } = useUi()
  const matter = data.cases.find(c => c.id === S(payload.caseId))
  const triggers = Array.from(new Set(data.rules.map(r => r.trigger)))
  const [label, setLabel] = useState(triggers[0] || '')
  const [date, setDate] = useState(matter?.triggerDate || todayIso())
  if (!matter) return null
  const preview = rulesForTrigger(data.rules, label).map(r => ({ rule: r, date: computeDeadlineDate(date, r, data.settings.courtHolidays) }))
  return <Dialog title="Add deadlines from a rule" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { const n = addDeadlinesFromTrigger(matter.id, label, date); close(); toast(n ? `${n} deadline${n === 1 ? '' : 's'} added.` : 'Those deadlines already exist.', { tone: n ? 'success' : 'info' }) }}>Add deadlines</Button></>}>
    <div className="form-grid"><Field label="Trigger event"><Select value={label} onChange={e => setLabel(e.target.value)}>{triggers.map(t => <option key={t}>{t}</option>)}</Select></Field><Field label="Trigger date"><TextInput type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></div>
    <div className="panel panel-body">{preview.map(p => <div className="spread" key={p.rule.id}><span>{p.rule.name} <span className="tiny">{p.rule.ruleRef}</span></span><strong>{formatDate(p.date)}</strong></div>)}</div>
  </Dialog>
}

function RulesDialog({ close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateRule } = useWorkspace()
  return <Dialog title="Deadline rules" subtitle="The attorney can view and edit every rule. Each deadline records the rule that produced it." onClose={close} width="780px" footer={<Button variant="primary" onClick={close}>Done</Button>}>
    <div className="session-warning">Seed values ship with the app. Confirm periods and rule references against the current Vermont Rules of Appellate Procedure before relying on them. Changing a rule recalculates deadlines without overrides.</div>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Rule</th><th>Trigger</th><th>Days</th><th>Roll weekend</th><th>Reference</th></tr></thead><tbody>{data.rules.map(rule => <tr key={rule.id}><td>{rule.name}</td><td>{rule.trigger}</td><td><TextInput type="number" min={0} value={rule.days} style={{ width: 80 }} onChange={e => updateRule(rule.id, { days: Number(e.target.value) })} /></td><td><input type="checkbox" checked={rule.rollWeekend} onChange={e => updateRule(rule.id, { rollWeekend: e.target.checked })} /></td><td><TextInput value={rule.ruleRef} onChange={e => updateRule(rule.id, { ruleRef: e.target.value })} /></td></tr>)}</tbody></table></div>
  </Dialog>
}

function OverrideDeadlineDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, overrideDeadline, clearDeadlineOverride } = useWorkspace()
  const deadline = data.deadlines.find(d => d.id === S(payload.deadlineId))
  const [date, setDate] = useState(deadline?.override?.date || (deadline ? addDays(deadline.computedDate, 14) : todayIso()))
  const [reason, setReason] = useState(deadline?.override?.reason || '')
  if (!deadline) return null
  return <Dialog title="Override deadline" subtitle="An override is logged with the reason, user, and time." onClose={close} footer={<><Button onClick={close}>Cancel</Button>{deadline.override ? <Button variant="danger" onClick={() => { clearDeadlineOverride(deadline.id); close() }}>Remove override</Button> : null}<Button variant="primary" disabled={!reason.trim()} onClick={() => { overrideDeadline(deadline.id, date, reason); close() }}>Save override</Button></>}>
    <div className="tiny">Computed date: {formatDate(deadline.computedDate)} · Rule {data.rules.find(r => r.id === deadline.ruleId)?.ruleRef}</div>
    <div className="form-grid"><Field label="New date" required><TextInput type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Reason" required className="span-2"><TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this deadline changing? This is logged." /></Field></div>
  </Dialog>
}

function NewDocumentDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { createDocument } = useWorkspace()
  const { toast } = useUi()
  const [caseId, setCaseId] = useState(S(payload.caseId))
  const { data } = useWorkspace()
  const active = data.cases.filter(c => !c.deletedAt && c.status === 'Active')
  const templates = data.documents.length ? undefined : undefined
  const [template, setTemplate] = useState('tpl_brief')
  const [title, setTitle] = useState('Appellant\'s Brief')
  const options = [
    ['tpl_brief', 'Appellate brief', 'Caption, statements, argument headings, certificate'],
    ['tpl_motion', 'Motion', 'Motion, memorandum, certificate'],
    ['tpl_soq', 'Statement of questions', 'Numbered questions, certificate'],
    ['tpl_toc', 'Table of contents', 'Live from headings'],
    ['tpl_toa', 'Table of authorities', 'Live from citations'],
    ['tpl_tos', 'Certificate of service', 'Live from service contacts'],
    ['tpl_other', 'Blank document', 'Caption and body'],
  ]
  return <Dialog title="New document" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!caseId} onClick={() => { const id = createDocument(caseId, template, title); close(); navigateTo({ view: 'case', caseId, section: 'documents', docId: id }); toast('Draft created from template.', { tone: 'success' }) }}>Create document</Button></>}>
    <Field label="Case" required><Select value={caseId} onChange={e => setCaseId(e.target.value)}>{active.map(c => <option key={c.id} value={c.id}>{c.caption}</option>)}</Select></Field>
    <Field label="Template" hint="Court formatting lives in the template."><Select value={template} onChange={e => { setTemplate(e.target.value); const found = options.find(o => o[0] === e.target.value); setTitle(found ? found[1] : 'Document') }}>{options.map(o => <option key={o[0]} value={o[0]}>{o[1]} — {o[2]}</option>)}</Select></Field>
    <Field label="Title" required><TextInput value={title} onChange={e => setTitle(e.target.value)} /></Field>
  </Dialog>
}

function CiteDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, createCitation, updateDocument, saveAuthorityToCase } = useWorkspace()
  const { selection } = useEditorSelection()
  const { toast } = useUi()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  const caseId = S(payload.caseId, doc?.caseId)
  const saved = data.caseAuthorities.filter(l => l.caseId === caseId)
  const [query, setQuery] = useState('')
  const [authorityId, setAuthorityId] = useState(S(payload.authorityId, saved[0]?.authorityId || data.authorities[0]?.id || ''))
  const [pinpoint, setPinpoint] = useState('')
  const auth = data.authorities.find(a => a.id === authorityId)
  const selected = selection && selection.docId === doc?.id ? selection : null
  const rows = data.authorities.filter(a => `${a.caseName} ${a.reporter}`.toLowerCase().includes(query.toLowerCase()))
  if (!doc) return <InfoDialog title="No draft" close={close} body={<p>Open a draft before citing an authority.</p>} />
  return <Dialog title="Cite authority" subtitle={selected ? `Insert after the selected sentence: “${selected.text.slice(0, 90)}”` : 'A citation will be added to the end of the document.'} onClose={close} width="680px" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!auth} onClick={() => {
    if (!auth) return
    let citation = data.citations.find(c => c.caseId === caseId && c.authorityId === auth.id && !c.pinpoint)
    if (!citation) {
      const id = createCitation(caseId, auth.id, pinpoint)
      citation = { id, caseId, authorityId: auth.id, pinpoint, status: 'Unverified', note: '', flagReason: '', createdAt: new Date().toISOString() }
      if (!saved.some(l => l.authorityId === auth.id)) saveAuthorityToCase(caseId, auth.id, '')
    }
    const token = insertedCitation(citation.id, pinpoint)
    const result = insertionToken(doc.blocks, selected?.blockId, token, selected?.text || '')
    updateDocument(doc.id, { blocks: result.blocks })
    close()
    toast('Citation inserted. It is Unverified until you check it.', { tone: 'info' })
  }}>Insert citation</Button></>}>
    <div className="research-grid">
      <div><div className="search-box" style={{ maxWidth: 'none' }}><TextInput placeholder="Filter authorities" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>{rows.map(a => <button key={a.id} className={`radio-row ${a.id === authorityId ? 'selected' : ''}`} style={{ marginBottom: 5, width: '100%' }} onClick={() => setAuthorityId(a.id)}><input type="radio" readOnly checked={a.id === authorityId} /><span><span className="radio-label">{a.caseName}</span><span className="field-hint">{a.reporter} ({a.year})</span></span></button>)}</div>
        {saved.length ? <div className="tiny" style={{ marginTop: 8 }}>Saved authorities appear first in the case’s research list.</div> : null}
      </div>
      <div>{auth ? <div className="panel panel-body"><div className="authority-title">{auth.caseName}</div><div className="authority-cite">{auth.reporter} ({auth.year})</div><div className="authority-summary">{auth.summary}</div><Field label="Pinpoint" hint="Page or paragraph, e.g. 556"><TextInput value={pinpoint} onChange={e => setPinpoint(e.target.value)} placeholder="556" /></Field><div className="field-hint" style={{ marginTop: 8 }}>{citationText(auth, pinpoint)}</div><div className="field-hint">This authority will be linked. The status starts Unverified.</div></div> : <div className="tiny">Choose an authority.</div>}</div>
    </div>
  </Dialog>
}

const insertedCitation = (id: string, pin: string) => `{{cite:${id}${pin ? ':' + pin : ''}}}`

export function MarkVerifiedDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, markCitation } = useWorkspace()
  const doc = payload.docId ? data.documents.find(d => d.id === S(payload.docId)) : undefined
  const docCitations = doc ? Array.from(new Set(docCitationUses(data, doc).map(u => u.citationId))) : []
  const initial = S(payload.citationId, docCitations[0] || '')
  const [citationId, setCitationId] = useState(initial)
  const [source, setSource] = useState<'Westlaw KeyCite' | 'Reading the opinion' | 'Other'>('Westlaw KeyCite')
  const [note, setNote] = useState('')
  const citation = data.citations.find(c => c.id === citationId)
  const auth = citation ? data.authorities.find(a => a.id === citation.authorityId) : undefined
  const options = (docCitations.length ? docCitations : data.citations.filter(c => c.caseId === S(payload.caseId)).map(c => c.id))
  if (!options.length) return <InfoDialog title="No citations to mark" close={close} body={<p>Insert a citation with References &gt; Cite first.</p>} />
  return <Dialog title="Mark citation verified" subtitle="The app never verifies a citation automatically. Record where you checked it." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => { markCitation(citationId, 'Verified', source, note); close() }}>Mark Verified</Button></>}>
    <Field label="Citation"><Select value={citationId} onChange={e => setCitationId(e.target.value)}>{options.map(id => { const cit = data.citations.find(c => c.id === id); const a = cit ? data.authorities.find(x => x.id === cit.authorityId) : undefined; return <option key={id} value={id}>{a?.caseName || 'Missing'} {cit?.pinpoint ? `at ${cit.pinpoint}` : ''}</option> })}</Select></Field>
    {auth ? <div className="authority-summary">{auth.summary}</div> : null}
    <Field label="Checked in"><Select value={source} onChange={e => setSource(e.target.value as typeof source)}>{['Westlaw KeyCite','Reading the opinion','Other'].map(s => <option key={s}>{s}</option>)}</Select></Field>
    <Field label="Note" hint="Optional. Recorded with today's date."><TextArea value={note} onChange={e => setNote(e.target.value)} /></Field>
    <div className="session-warning">The date checked will be recorded as {formatDate(todayIso())}.</div>
  </Dialog>
}

function FlagDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, markCitation } = useWorkspace()
  const [reason, setReason] = useState('')
  const citation = data.citations.find(c => c.id === S(payload.citationId))
  if (!citation) return null
  const auth = data.authorities.find(a => a.id === citation.authorityId)
  return <Dialog title="Flag citation" subtitle={auth?.caseName} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!reason.trim()} onClick={() => { markCitation(citation.id, 'Flagged', undefined, reason); close() }}>Flag citation</Button></>}>
    <Field label="Reason" required><TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="What needs attention before this authority is relied on?" /></Field>
  </Dialog>
}

function ScanDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, markCitation } = useWorkspace()
  const { toast } = useUi()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  if (!doc) return <InfoDialog title="Citation Scan" close={close} body={<p>Open a draft to scan it.</p>} />
  const scan = scanDocument(data, doc)
  return <Dialog title="Citation Scan" subtitle={`${doc.title} · ${scan.citedCount} linked citations`} onClose={close} width="700px" footer={<><Button onClick={close}>Close</Button><Button variant="primary" onClick={() => { close(); toast(scan.findings.length ? `${scan.findings.length} findings` : 'No citation issues found.', { tone: scan.findings.length ? 'info' : 'success' }) }}>Done</Button></>}>
    {scan.findings.length ? scan.findings.map(finding => <div className={`issue-row ${finding.severity}`} key={finding.id}><div className="issue-title">{finding.title}</div><div className="issue-detail">{finding.detail}</div><div className="row" style={{ marginTop: 4 }}>{finding.blockId ? <Button size="sm" variant="ghost" onClick={() => { close(); window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: finding.blockId })) }}>Go to</Button> : null}{finding.citationId && finding.kind === 'unverified' ? <Button size="sm" variant="ghost" onClick={() => { close(); window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: finding.blockId })) }}>Review in text</Button> : null}</div></div>) : <div className="empty"><h3>No citation issues</h3><div className="tiny">All linked citations are verified and every reporter citation has a record.</div></div>}
  </Dialog>
}

function NewAuthorityDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { createAuthority, saveAuthorityToCase } = useWorkspace()
  const { toast } = useUi()
  const [caseName, setCaseName] = useState('')
  const [reporter, setReporter] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [court, setCourt] = useState('Vermont Supreme Court')
  const [summary, setSummary] = useState('')
  const [url, setUrl] = useState('')
  const caseId = S(payload.caseId)
  return <Dialog title="Add authority" subtitle="A saved authority is a shared library record. Notes stay inside the case." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!caseName.trim() || !reporter.trim()} onClick={() => { const id = createAuthority({ caseName, reporter, year: Number(year), court, summary, text: '', url, source: 'Manual' }); if (caseId) saveAuthorityToCase(caseId, id, ''); close(); toast('Authority added.', { tone: 'success' }) }}>Add authority</Button></>}>
    <div className="form-grid"><Field label="Case name" required className="span-2"><TextInput value={caseName} onChange={e => setCaseName(e.target.value)} placeholder="Doe v. State" /></Field><Field label="Reporter citation" required><TextInput value={reporter} onChange={e => setReporter(e.target.value)} placeholder="2026 VT 1" /></Field><Field label="Year"><TextInput value={year} onChange={e => setYear(e.target.value)} /></Field><Field label="Court"><TextInput value={court} onChange={e => setCourt(e.target.value)} /></Field><Field label="Source URL"><TextInput value={url} onChange={e => setUrl(e.target.value)} /></Field><Field label="Summary" className="span-2"><TextArea value={summary} onChange={e => setSummary(e.target.value)} /></Field></div>
    <div className="session-warning">Confirm the citation and read the opinion before marking it verified. The app does not validate citations.</div>
  </Dialog>
}

function SaveAuthorityDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, saveAuthorityToCase, updateCaseAuthorityNote, createAuthority } = useWorkspace()
  const { toast } = useUi()
  const authority = data.authorities.find(a => a.id === S(payload.authorityId))
  const active = data.cases.filter(c => !c.deletedAt)
  const [caseId, setCaseId] = useState(S(payload.caseId, active[0]?.id || ''))
  const existing = data.caseAuthorities.find(l => l.caseId === caseId && l.authorityId === S(payload.authorityId))
  const [note, setNote] = useState(existing?.note || '')
  if (!authority) return null
  return <Dialog title="Save authority to case" subtitle={authority.caseName} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!caseId} onClick={() => { if (existing) updateCaseAuthorityNote(existing.id, note); else saveAuthorityToCase(caseId, authority.id, note); close(); toast('Authority saved to the case.', { tone: 'success' }) }}>Save to case</Button></>}>
    <Field label="Case"><Select value={caseId} onChange={e => setCaseId(e.target.value)}>{active.map(c => <option key={c.id} value={c.id}>{c.caption}</option>)}</Select></Field>
    <Field label="Note for this case" hint="Notes are kept per case. They do not appear in another client's case."><TextArea value={note} onChange={e => setNote(e.target.value)} /></Field>
    <div className="field-hint">{authority.reporter} ({authority.year}) · {authority.court}</div>
  </Dialog>
}

function OpinionReaderDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data } = useWorkspace()
  const service = data.settings.approvedServices.find(s => s.id === 'svc_courtlistener')
  const opinionId = S(payload.opinionId)
  const caseName = S(payload.caseName, 'Opinion')
  const citation = S(payload.citation)
  const court = S(payload.court)
  const year = S(payload.year)
  const storedText = S(payload.text)
  const [text, setText] = useState(storedText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = async () => {
    if (!opinionId) return
    setBusy(true)
    setError(null)
    try {
      setText(await fetchOpinionText({ opinionId, token: service?.approved ? service.token : '', endpoint: service?.endpoint }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The opinion could not be loaded.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (!storedText && opinionId) void load()
    // The reader opens for one opinion; fetch once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const paragraphs = useMemo(() => opinionParagraphs(text), [text])
  const isHeading = (paragraph: string) =>
    paragraph.length < 120 &&
    ((paragraph === paragraph.toUpperCase() && /[A-Z]/.test(paragraph)) ||
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s/.test(paragraph))
  return (
    <Dialog
      title={caseName}
      eyebrow="Opinion reader"
      subtitle={[citation, court, year].filter(Boolean).join(' · ') || 'Full opinion text'}
      onClose={close}
      width="980px"
      footer={<><span className="tiny" style={{ marginRight: 'auto' }}>Read inside the workspace. Text is provided by CourtListener.</span><Button onClick={close}>Close</Button></>}
    >
      {busy ? <div className="tiny">Loading the opinion text…</div> : null}
      {error ? <div className="session-warning">{error}<div style={{ marginTop: 8 }}><Button size="sm" onClick={() => void load()}>Try again</Button></div></div> : null}
      {!text && !busy && !error ? <div className="tiny">No opinion text is available for this authority. Search for it again to read the full text.</div> : null}
      {paragraphs.length ? <div className="opinion-reader">{paragraphs.map((paragraph, index) => isHeading(paragraph) ? <h3 key={index}>{paragraph}</h3> : <p key={index}>{paragraph}</p>)}</div> : null}
    </Dialog>
  )
}

function ExhibitDialog({ payload, close, edit }: { payload: Record<string, unknown>; close: () => void; edit: boolean }) {
  const { data, addExhibit, updateExhibit, replaceExhibitFile, readFileBytes, moveToTrash } = useWorkspace()
  const { toast } = useUi()
  const exhibit = edit ? data.exhibits.find(e => e.id === S(payload.exhibitId)) : undefined
  const caseId = S(payload.caseId, exhibit?.caseId)
  const exhibits = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt)
  const [number, setNumber] = useState(String(exhibit?.number ?? (exhibits.length ? Math.max(...exhibits.map(e => e.number)) + 1 : 1)))
  const [title, setTitle] = useState(exhibit?.title || '')
  const [description, setDescription] = useState(exhibit?.description || '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!caseId) return null
  const save = async () => {
    setBusy(true); setError(null)
    try {
      let exhibitId = exhibit?.id
      if (exhibit) updateExhibit(exhibit.id, { number: Number(number) || 1, title, description })
      else exhibitId = addExhibit(caseId, { number: Number(number) || 1, title, description, pages: 0 })
      if (file && exhibitId) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const summary = await getPdfSummary(bytes)
        await replaceExhibitFile(exhibitId, bytes, { fileName: file.name, pages: summary.pages, hasFormFields: summary.hasForms })
      }
      close(); toast(file ? 'Exhibit saved with its PDF.' : 'Exhibit saved.', { tone: 'success' })
    } catch (err) { setError(err instanceof Error ? err.message : 'The exhibit could not be saved.') } finally { setBusy(false) }
  }
  return <Dialog title={edit ? 'Edit exhibit' : 'Add exhibit'} onClose={close} footer={<><Button onClick={close}>Cancel</Button>{edit ? <Button variant="danger" onClick={() => { if (exhibit) { moveToTrash('Exhibit', exhibit.id); close(); toast('Exhibit moved to Recently Deleted.', { tone: 'info' }) } }}>Delete</Button> : null}<Button variant="primary" busy={busy} onClick={() => void save()}>{edit ? 'Save exhibit' : 'Add exhibit'}</Button></>}>
    <div className="form-grid"><Field label="Exhibit number"><TextInput type="number" min={1} value={number} onChange={e => setNumber(e.target.value)} /></Field><Field label="Title"><TextInput value={title} onChange={e => setTitle(e.target.value)} placeholder="Site plan" /></Field><Field label="Description" className="span-2"><TextArea value={description} onChange={e => setDescription(e.target.value)} /></Field><Field label="PDF file" hint="PDF only. Recognize Text (OCR) is planned for version 1.1." className="span-2"><TextInput type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></Field></div>
    {edit && exhibit?.fileId ? <div className="field-hint">Current file: {exhibit.fileName} · {exhibit.pages} pages. Choosing a new PDF replaces it.</div> : null}
    {error ? <div className="session-warning">{error}</div> : null}
  </Dialog>
}

function XrefDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateDocument } = useWorkspace()
  const { selection } = useEditorSelection()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  const exhibits = data.exhibits.filter(e => e.caseId === S(payload.caseId, doc?.caseId) && !e.deletedAt).sort((a, b) => a.number - b.number)
  const [exhibitId, setExhibitId] = useState(exhibits[0]?.id || '')
  const [page, setPage] = useState('1')
  const exhibit = exhibits.find(e => e.id === exhibitId)
  if (!doc) return null
  const selected = selection && selection.docId === doc.id ? selection : null
  return <Dialog title="Exhibit cross-reference" subtitle="The reference stays live. Renumbering the exhibit updates every reference." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!exhibit} onClick={() => { if (!exhibit) return; const token = `{{ex:${exhibit.id}:${page || ''}}}`; const result = insertionToken(doc.blocks, selected?.blockId, token, selected?.text || ''); updateDocument(doc.id, { blocks: result.blocks }); close() }}>Insert reference</Button></>}>
    {exhibits.length ? <div className="form-grid"><Field label="Exhibit"><Select value={exhibitId} onChange={e => setExhibitId(e.target.value)}>{exhibits.map(e => <option key={e.id} value={e.id}>Ex. {e.number} — {e.title}</option>)}</Select></Field><Field label="Page"><TextInput type="number" min={1} value={page} onChange={e => setPage(e.target.value)} /></Field></div> : <div className="empty"><h3>No exhibits</h3><div className="tiny">Add an exhibit first.</div></div>}
    {exhibit ? <div className="field-hint">Preview: Ex. {exhibit.number}{page ? `, p. ${page}` : ''}</div> : null}
  </Dialog>
}

function BatesDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, readFileBytes, replaceExhibitFile } = useWorkspace()
  const { toast } = useUi()
  const exhibits = data.exhibits.filter(e => e.caseId === S(payload.caseId) && !e.deletedAt && e.fileId)
  const [exhibitId, setExhibitId] = useState(exhibits[0]?.id || '')
  const exhibit = exhibits.find(e => e.id === exhibitId)
  const [prefix, setPrefix] = useState(exhibit?.bates?.prefix || 'ABC-')
  const [start, setStart] = useState(String(exhibit?.bates?.start || 1))
  const [placement, setPlacement] = useState<'Bottom right' | 'Bottom center' | 'Top right'>((exhibit?.bates?.placement as 'Bottom right') || 'Bottom right')
  const [busy, setBusy] = useState(false)
  return <Dialog title="Bates Numbering" onClose={close} width="620px" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy} disabled={!exhibit} onClick={async () => { if (!exhibit?.fileId) return; setBusy(true); try { const bytes = await readFileBytes(exhibit.fileId); if (!bytes) throw new Error('The exhibit file could not be read.'); const stamped = await stampExhibit(bytes, { prefix, start: Number(start) || 1, placement }); await replaceExhibitFile(exhibit.id, stamped.bytes, { fileName: exhibit.fileName || 'exhibit.pdf', pages: exhibit.pages, hasFormFields: false, bates: { prefix, start: stamped.start, end: stamped.end, placement, appliedAt: new Date().toISOString() } }); close(); toast(`Bates numbers applied to ${exhibit.pages} pages.`, { tone: 'success' }) } catch (err) { toast(err instanceof Error ? err.message : 'Bates numbering failed.', { tone: 'danger' }) } finally { setBusy(false) } }}>Apply numbering</Button></>}>
    {exhibits.length ? <><Field label="Exhibit"><Select value={exhibitId} onChange={e => setExhibitId(e.target.value)}>{exhibits.map(e => <option key={e.id} value={e.id}>Ex. {e.number} — {e.title} ({e.pages} pages)</option>)}</Select></Field><div className="form-grid"><Field label="Prefix"><TextInput value={prefix} onChange={e => setPrefix(e.target.value)} /></Field><Field label="Starting number"><TextInput type="number" min={1} value={start} onChange={e => setStart(e.target.value)} /></Field><Field label="Placement"><Select value={placement} onChange={e => setPlacement(e.target.value as typeof placement)}>{['Bottom right','Bottom center','Top right'].map(p => <option key={p}>{p}</option>)}</Select></Field><Field label="Ending number"><TextInput readOnly value={exhibit ? String((Number(start) || 1) + exhibit.pages - 1) : ''} /></Field></div></> : <div className="tiny">No exhibits with a PDF attached for this case.</div>}
  </Dialog>
}

function OrganizeDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, readFileBytes, replaceExhibitFile, addExhibit } = useWorkspace()
  const { toast } = useUi()
  const exhibits = data.exhibits.filter(e => e.caseId === S(payload.caseId) && !e.deletedAt && e.fileId)
  const [exhibitId, setExhibitId] = useState(exhibits[0]?.id || '')
  const exhibit = exhibits.find(e => e.id === exhibitId)
  const [order, setOrder] = useState<number[]>([])
  const [rotation, setRotation] = useState<Record<number, number>>({})
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState<string | null>(null)
  const load = async () => {
    if (!exhibit?.fileId) return
    const bytes = await readFileBytes(exhibit.fileId)
    if (!bytes) return
    const { organizeLoad } = await import('./dialogUtils')
    setOrder(Array.from({ length: exhibit.pages }, (_, i) => i))
    setRotation({}); setLoaded(exhibit.id)
  }
  if (exhibit && loaded !== exhibit.id) void load()
  const rotate = (index: number) => setRotation(prev => ({ ...prev, [order[index]]: ((prev[order[index]] || 0) + 90) % 360 }))
  const move = (index: number, delta: number) => { const next = [...order]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setOrder(next) }
  const apply = async () => {
    if (!exhibit?.fileId) return
    setBusy(true)
    try {
      const bytes = await readFileBytes(exhibit.fileId)
      if (!bytes) throw new Error('The exhibit file could not be read.')
      const { organizeApply } = await import('./dialogUtils')
      const result = await organizeApply(bytes, order, rotation)
      await replaceExhibitFile(exhibit.id, result, { fileName: exhibit.fileName || 'exhibit.pdf', pages: exhibit.pages, hasFormFields: false })
      close(); toast('Pages reorganized.', { tone: 'success' })
    } catch (err) { toast(err instanceof Error ? err.message : 'The pages could not be saved.', { tone: 'danger' }) } finally { setBusy(false) }
  }
  const extract = async () => {
    if (!exhibit?.fileId) return
    setBusy(true)
    try {
      const bytes = await readFileBytes(exhibit.fileId)
      if (!bytes) throw new Error('The file could not be read.')
      const { extractSelected } = await import('./dialogUtils')
      const newBytes = await extractSelected(bytes, order)
      const id = addExhibit(exhibit.caseId, { number: Math.max(...data.exhibits.filter(e => e.caseId === exhibit.caseId).map(e => e.number), 0) + 1, title: `${exhibit.title} (excerpt)`, description: 'Extracted pages', pages: order.length })
      await replaceExhibitFile(id, newBytes, { fileName: 'excerpt.pdf', pages: order.length, hasFormFields: false })
      close(); toast('Extracted pages into a new exhibit.', { tone: 'success' })
    } catch (err) { toast(err instanceof Error ? err.message : 'The extract failed.', { tone: 'danger' }) } finally { setBusy(false) }
  }
  return <Dialog title="Organize Pages" subtitle="Acrobat-style page tools. Every drag action has a button equivalent." onClose={close} width="680px" footer={<><Button onClick={close}>Cancel</Button><Button variant="ghost" busy={busy} onClick={() => void extract()}>Extract selected</Button><Button variant="primary" busy={busy} onClick={() => void apply()}>Apply order and rotation</Button></>}>
    <Field label="Exhibit"><Select value={exhibitId} onChange={e => { setExhibitId(e.target.value); setLoaded(null) }}>{exhibits.map(e => <option key={e.id} value={e.id}>Ex. {e.number} — {e.title} ({e.pages} pages)</option>)}</Select></Field>
    {exhibit ? <div className="page-grid">{order.map((original, index) => <div className="page-row" key={original}><span className="page-number">{index + 1}</span><span>PDF page {original + 1}{rotation[original] ? ` · ${rotation[original]}°` : ''}</span><div className="page-tools"><Button size="sm" variant="ghost" onClick={() => move(index, -1)} aria-label="Move up">↑</Button><Button size="sm" variant="ghost" onClick={() => move(index, 1)} aria-label="Move down">↓</Button><Button size="sm" variant="ghost" onClick={() => rotate(index)} aria-label="Rotate">↻</Button></div></div>)}</div> : <div className="tiny">No exhibits with a PDF for this case.</div>}
    <div className="field-hint">Extract takes the current ordered list and makes a new exhibit. Reordering and rotation apply to the exhibit file.</div>
  </Dialog>
}

function CombineDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, readFileBytes, addExhibit, replaceExhibitFile } = useWorkspace()
  const { toast } = useUi()
  const exhibits = data.exhibits.filter(e => e.caseId === S(payload.caseId) && !e.deletedAt && e.fileId)
  const [ids, setIds] = useState<string[]>([])
  const [title, setTitle] = useState('Combined exhibits')
  const [busy, setBusy] = useState(false)
  return <Dialog title="Combine Files" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy} disabled={ids.length < 2} onClick={async () => { setBusy(true); try {
    const files = []
    for (const id of ids) { const ex = exhibits.find(e => e.id === id); if (!ex?.fileId) continue; const bytes = await readFileBytes(ex.fileId); if (bytes) files.push(bytes) }
    const { combineFiles } = await import('./dialogUtils')
    const bytes = await combineFiles(files)
    const pages = files.reduce((sum, _, i) => sum + (exhibits.find(e => e.id === ids[i])?.pages || 0), 0)
    const newId = addExhibit(S(payload.caseId), { number: Math.max(...data.exhibits.filter(e => e.caseId === S(payload.caseId)).map(e => e.number), 0) + 1, title, description: ids.map(id => exhibits.find(e => e.id === id)?.title).filter(Boolean).join('; '), pages })
    await replaceExhibitFile(newId, bytes, { fileName: 'combined.pdf', pages, hasFormFields: false })
    close(); toast('Files combined into a new exhibit.', { tone: 'success' })
  } catch (err) { toast(err instanceof Error ? err.message : 'The files could not be combined.', { tone: 'danger' }) } finally { setBusy(false) } }}>Combine {ids.length || ''}</Button></>}>
    <Field label="New exhibit title"><TextInput value={title} onChange={e => setTitle(e.target.value)} /></Field>
    <div style={{ maxHeight: 300, overflowY: 'auto' }}>{exhibits.map(ex => <label className="row" key={ex.id} style={{ padding: '5px 0' }}><input type="checkbox" checked={ids.includes(ex.id)} onChange={e => setIds(prev => e.target.checked ? [...prev, ex.id] : prev.filter(id => id !== ex.id))} /><span>Ex. {ex.number} — {ex.title} <span className="tiny">({ex.pages} pages)</span></span></label>)}</div>
    <div className="field-hint">Order follows the list from top to bottom.</div>
  </Dialog>
}

function IndexDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateDocument } = useWorkspace()
  const { toast } = useUi()
  const caseId = S(payload.caseId)
  const exhibits = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt).sort((a, b) => a.number - b.number)
  const doc = data.documents.find(d => d.caseId === caseId && !d.deletedAt)
  return <Dialog title="Exhibit Index" onClose={close} footer={<><Button onClick={close}>Close</Button>{doc ? <Button variant="primary" onClick={() => { updateDocument(doc.id, { blocks: [...doc.blocks, { id: `blk_${Date.now()}`, type: 'exhibitIndex', text: '' }] }); close(); toast('Exhibit index added to the draft.', { tone: 'success' }) }}>Insert into draft</Button> : null}</>}>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Ex.</th><th>Description</th><th>Pages</th><th>Bates</th></tr></thead><tbody>{exhibits.map(e => <tr key={e.id}><td>{e.number}</td><td>{e.title}</td><td>{e.pages}</td><td className="bates">{e.bates ? `${e.bates.prefix}${e.bates.start}–${e.bates.end}` : '—'}</td></tr>)}</tbody></table></div>
    {!exhibits.length ? <div className="tiny">No exhibits for this case.</div> : null}
    {doc ? <div className="field-hint">A live exhibit index block is generated from this list when printed or exported.</div> : <div className="field-hint">Create a draft to insert the index.</div>}
  </Dialog>
}

function ViewExhibitDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, readFileBytes } = useWorkspace()
  const exhibit = data.exhibits.find(e => e.id === S(payload.exhibitId))
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  if (!exhibit) return null
  if (exhibit.fileId && !url && !error) {
    void readFileBytes(exhibit.fileId).then(bytes => { if (bytes) setUrl(URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }))); else setError('The exhibit file could not be read.') }).catch(() => setError('The exhibit file could not be read.'))
  }
  return <Dialog title={`Exhibit ${exhibit.number}: ${exhibit.title}`} subtitle={`${exhibit.pages} pages · ${exhibit.fileName || 'No file'}`} onClose={() => { if (url) URL.revokeObjectURL(url); close() }} width="900px" footer={<><Button onClick={() => { if (url) URL.revokeObjectURL(url); close() }}>Close</Button>{url ? <Button onClick={() => window.open(url, '_blank')}>Open in browser</Button> : null}</>}>
    {url ? <iframe className="pdf-viewer" src={`${url}#page=1`} title={`Exhibit ${exhibit.number}`} /> : <div className="table-empty">{error || 'Loading PDF…'}</div>}
    {exhibit.bates ? <div className="tiny">Bates: {exhibit.bates.prefix}{String(exhibit.bates.start).padStart(6, '0')}–{String(exhibit.bates.end).padStart(6, '0')}</div> : null}
  </Dialog>
}

function FilingDialog({ payload, close, edit }: { payload: Record<string, unknown>; close: () => void; edit: boolean }) {
  const { data, createFiling, updateFiling } = useWorkspace()
  const { toast } = useUi()
  const filing = edit ? data.filings.find(f => f.id === S(payload.filingId)) : undefined
  const caseId = S(payload.caseId, filing?.caseId)
  const matter = data.cases.find(c => c.id === caseId)
  const docs = data.documents.filter(d => d.caseId === caseId && !d.deletedAt)
  const serviceLinks = data.caseContacts.filter(l => l.caseId === caseId && l.active && l.service)
  const exhibits = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt)
  const [documentId, setDocumentId] = useState(filing?.documentId || docs[0]?.id || '')
  const [type, setType] = useState(filing?.type || 'eFile and Serve')
  const [code, setCode] = useState(filing?.filingCode || '')
  const [fees, setFees] = useState(filing?.fees || data.settings.defaultFilingFees)
  const [payment, setPayment] = useState(filing?.paymentAccount || data.settings.paymentAccounts[0] || '')
  const [attorney, setAttorney] = useState(filing?.filingAttorney || data.settings.filingAttorneys[0] || data.user)
  const [additional, setAdditional] = useState(filing?.additionalAttorneys || '')
  const [underSeal, setUnderSeal] = useState(filing?.underSeal || false)
  const [limited, setLimited] = useState(filing?.limitedAppearance || false)
  const [contactIds, setContactIds] = useState<string[]>(filing?.serviceContactIds || serviceLinks.map(l => l.id))
  const [exhibitIds, setExhibitIds] = useState<string[]>(filing?.exhibitIds || exhibits.filter(e => docs.find(d => d.id === documentId)?.blocks.some(b => b.text.includes(`{{ex:${e.id}`))).map(e => e.id))
  if (!matter) return null
  const save = () => {
    if (!documentId) return toast('Choose the document this filing includes.', { tone: 'danger' })
    const input = { caseId, documentId, type, filingCode: code, fees, paymentAccount: payment, filingAttorney: attorney, additionalAttorneys: additional, underSeal, limitedAppearance: limited, serviceContactIds: contactIds, exhibitIds }
    if (filing) updateFiling(filing.id, input)
    else createFiling(input)
    close(); toast(filing ? 'Filing updated. Preflight reruns.' : 'Filing draft created. Preflight is running below.', { tone: 'success' })
  }
  return <Dialog title={edit ? 'Edit filing' : 'New Filing'} subtitle={`${matter.caption} · ${matter.number}`} onClose={close} width="760px" footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={save}>{edit ? 'Save filing' : 'Create filing draft'}</Button></>}>
    <div className="form-grid">
      <Field label="Document" required className="span-2"><Select value={documentId} onChange={e => setDocumentId(e.target.value)}>{docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</Select></Field>
      <Field label="Filing type" required className="span-2"><Select value={type} onChange={e => setType(e.target.value as typeof type)}><option>eFile Only</option><option>eFile and Serve</option><option>Serve Only</option></Select></Field>
      <Field label="Filing code" required hint="Use the exact code shown in eFile & Serve."><TextInput list="filing-codes" value={code} onChange={e => setCode(e.target.value)} /><datalist id="filing-codes">{data.settings.filingCodes.map(c => <option key={c} value={c} />)}</datalist></Field>
      <Field label="Fees"><TextInput value={fees} onChange={e => setFees(e.target.value)} placeholder="0.00" /></Field>
      <Field label="Payment account"><TextInput value={payment} onChange={e => setPayment(e.target.value)} /></Field>
      <Field label="Filing attorney" required><TextInput value={attorney} onChange={e => setAttorney(e.target.value)} /></Field>
      <Field label="Additional attorneys" className="span-2"><TextInput value={additional} onChange={e => setAdditional(e.target.value)} /></Field>
    </div>
    <div className="row-wrap"><Checkbox label="Under Seal" checked={underSeal} onChange={setUnderSeal} /><Checkbox label="Limited Appearance" checked={limited} onChange={setLimited} /></div>
    <div><div className="section-title">Service Contacts</div>{serviceLinks.length ? serviceLinks.map(link => { const contact = data.contacts.find(c => c.id === link.contactId); return <Checkbox key={link.id} label={`${contact?.name}${contact?.address1 ? '' : ' — no address'}`} checked={contactIds.includes(link.id)} onChange={v => setContactIds(prev => v ? [...prev, link.id] : prev.filter(id => id !== link.id))} /> }) : <div className="tiny">No service contacts yet. Add them in People first.</div>}</div>
    <div><div className="section-title">Exhibits in packet</div>{exhibits.length ? exhibits.map(ex => <Checkbox key={ex.id} label={`Ex. ${ex.number} — ${ex.title}${ex.fileId ? '' : ' (no PDF)'}`} checked={exhibitIds.includes(ex.id)} onChange={v => setExhibitIds(prev => v ? [...prev, ex.id] : prev.filter(id => id !== ex.id))} />) : <div className="tiny">No exhibits.</div>}</div>
    <div className="field-hint">Preflight checks filing code, attorney, service addresses, document, certificate, citations, exhibits, and packet naming.</div>
  </Dialog>
}

function StageDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, stageFiling, readFileBytes } = useWorkspace()
  const { toast } = useUi()
  const filing = data.filings.find(f => f.id === S(payload.filingId))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<import('../core/store').StagingOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!filing) return null
  const doc = data.documents.find(d => d.id === filing.documentId)
  const matter = data.cases.find(c => c.id === filing.caseId)
  const preflight = matter && doc ? runPreflight(data, filing, matter, doc) : null
  return <Dialog title="Stage Filing" subtitle="Preflight does not submit. Staging assembles the packet." onClose={close} width="720px" footer={<><Button onClick={close}>Close</Button>{result ? <Button variant="primary" onClick={async () => { const bytes = await readFileBytes(result.zipFileId); if (bytes) downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }), result.zipName) }}>Download packet</Button> : <Button variant="primary" busy={busy} disabled={!preflight?.ok} onClick={async () => { setBusy(true); setError(null); try { const staged = await stageFiling(filing.id); setResult(staged); toast('Packet staged.', { tone: 'success' }) } catch (err) { setError(err instanceof Error ? err.message : 'The packet could not be staged.') } finally { setBusy(false) } }}>Stage Filing</Button>}</>}>
    {preflight ? <><div className={`panel panel-body`}><div className="row"><Status state={preflight.failed ? 'Failed' : preflight.overridden ? 'Overridden' : 'Passed'} /><strong>{preflight.passed} passed · {preflight.failed} failed · {preflight.overridden} overridden</strong></div>{preflight.failed ? <div className="field-hint">Resolve failures or log overrides before staging.</div> : null}</div>
      <div className="preflight-list">{preflight.checks.map(c => <div className="preflight-row" key={c.id}><div className="grow"><div className="check-label">{c.label}</div><div className="check-detail">{c.detail}</div></div><Status state={c.state} /></div>)}</div>
      {error ? <div className="session-warning">{error}</div> : null}
      {result ? <div><div className="section-title">Packet staged</div><div className="packet-files">{result.packet.files.map(f => <div className="packet-file" key={f.name}><span>{f.name}</span><span className="tiny">{f.kind}</span></div>)}</div><div className="field-hint">Record the filing result after submitting in eFile &amp; Serve. A confirmed packet is not a submission.</div><pre className="checklist-pre">{result.packet.checklist}</pre></div> : null}
    </> : <div className="tiny">The filing’s draft could not be found.</div>}
  </Dialog>
}

function OverridePreflightDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { overridePreflight } = useWorkspace()
  const { toast } = useUi()
  const [reason, setReason] = useState('')
  return <Dialog title="Override preflight check" subtitle="An override is logged with your name and reason. This is the only path for a citation issue." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!reason.trim()} onClick={() => { overridePreflight(S(payload.filingId), S(payload.checkId, 'citations'), reason); close(); toast('Override logged.', { tone: 'info' }) }}>Log override</Button></>}>
    <Field label="Reason" required><TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this check being overridden?" /></Field>
    <div className="field-hint">Overrides appear in the audit log and on the filing. The default is to resolve the problem instead.</div>
  </Dialog>
}

function ResultDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, recordFilingResult } = useWorkspace()
  const { toast } = useUi()
  const filing = data.filings.find(f => f.id === S(payload.filingId))
  const [status, setStatus] = useState<'Submitted' | 'Accepted' | 'Rejected' | 'Served'>('Submitted')
  const [envelope, setEnvelope] = useState(filing?.envelopeNumber || '')
  const [reason, setReason] = useState(filing?.rejectionReason || '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  if (!filing) return null
  return <Dialog title="Record Filing Result" subtitle="Record what eFile & Serve returned. Filed records cannot be deleted or edited." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy} disabled={!envelope.trim()} onClick={async () => { setBusy(true); try { const proof = file ? { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null; await recordFilingResult(filing.id, { status, envelopeNumber: envelope, rejectionReason: reason, proof }); close(); toast('Filing result recorded.', { tone: 'success' }) } catch (err) { toast(err instanceof Error ? err.message : 'The result could not be recorded.', { tone: 'danger' }) } finally { setBusy(false) } }}>Record result</Button></>}>
    <Field label="Envelope number" required><TextInput value={envelope} onChange={e => setEnvelope(e.target.value)} /></Field>
    <Field label="Status" required><Select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option>Submitted</option><option>Accepted</option><option>Rejected</option><option>Served</option></Select></Field>
    <Field label={status === 'Rejected' ? 'Rejection reason' : 'Note'} hint={status === 'Rejected' ? 'Rejected filings appear at the top of the Filing Queue.' : 'Optional note stored with the filing result.'}><TextArea value={reason} onChange={e => setReason(e.target.value)} /></Field>
    <Field label="Proof of Service PDF" hint="From eFile & Serve. Stored encrypted against this filing."><TextInput type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
  </Dialog>
}

function ContactDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, addContact, updateContact, updateCaseContact } = useWorkspace()
  const { toast } = useUi()
  const caseId = S(payload.caseId)
  const link = payload.linkId ? data.caseContacts.find(l => l.id === S(payload.linkId)) : undefined
  const contact = link ? data.contacts.find(c => c.id === link.contactId) : undefined
  const [name, setName] = useState(contact?.name || '')
  const [org, setOrg] = useState(contact?.organization || '')
  const [roleTitle, setRoleTitle] = useState(contact?.roleTitle || '')
  const [address1, setAddress1] = useState(contact?.address1 || '')
  const [city, setCity] = useState(contact?.city || '')
  const [state, setState] = useState(contact?.state || 'VT')
  const [zip, setZip] = useState(contact?.zip || '')
  const [email, setEmail] = useState(contact?.email || '')
  const [phone, setPhone] = useState(contact?.phone || '')
  const [roles, setRoles] = useState<('Party' | 'Counsel')[]>(link?.roles || ['Counsel'])
  const [service, setService] = useState(link?.service ?? true)
  const [source, setSource] = useState(contact?.source || 'Case')
  const save = () => {
    if (!name.trim()) return toast('Enter a name.', { tone: 'danger' })
    if (contact) {
      updateContact(contact.id, { name, organization: org, roleTitle, address1, city, state, zip, email, phone })
      if (link) updateCaseContact(link.id, { roles, service })
    } else {
      addContact(caseId || null, { name, organization: org, roleTitle, address1, address2: '', city, state, zip, email, phone, notes: '', source }, roles, service)
    }
    close(); toast('Contact saved.', { tone: 'success' })
  }
  return <Dialog title={contact ? 'Edit contact' : 'Add contact'} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={save}>Save contact</Button></>}>
    <div className="form-grid">
      <Field label="Name" required><TextInput value={name} onChange={e => setName(e.target.value)} autoFocus /></Field>
      <Field label="Organization"><TextInput value={org} onChange={e => setOrg(e.target.value)} /></Field>
      <Field label="Title / designation"><TextInput value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Appellant" /></Field>
      <Field label="Source"><Select value={source} onChange={e => setSource(e.target.value as typeof source)}><option>Case</option><option>Firm</option><option>Public</option></Select></Field>
      <Field label="Address" className="span-2"><TextInput value={address1} onChange={e => setAddress1(e.target.value)} placeholder="Street address" /></Field>
      <Field label="City"><TextInput value={city} onChange={e => setCity(e.target.value)} /></Field>
      <Field label="State"><TextInput value={state} onChange={e => setState(e.target.value)} /></Field>
      <Field label="ZIP"><TextInput value={zip} onChange={e => setZip(e.target.value)} /></Field>
      <Field label="Email"><TextInput value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Phone"><TextInput value={phone} onChange={e => setPhone(e.target.value)} /></Field>
    </div>
    <div className="row-wrap"><Checkbox label="Party" checked={roles.includes('Party')} onChange={v => setRoles(prev => v ? [...prev, 'Party'] : prev.filter(r => r !== 'Party'))} /><Checkbox label="Counsel" checked={roles.includes('Counsel')} onChange={v => setRoles(prev => v ? [...prev, 'Counsel'] : prev.filter(r => r !== 'Counsel'))} /><Checkbox label="Receives service" checked={service} onChange={setService} /></div>
    <div className="field-hint">Removing a contact from a case keeps the master record and its history. Preflight blocks a filing when a required recipient has no service address.</div>
  </Dialog>
}

function ServiceDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateCaseContact } = useWorkspace()
  const caseId = S(payload.caseId)
  const links = data.caseContacts.filter(l => l.caseId === caseId && l.active)
  return <Dialog title="Service Contacts" subtitle="Turn Service on for each contact that receives a filing. Preflight checks addresses." onClose={close} footer={<Button variant="primary" onClick={close}>Done</Button>}>
    {links.length ? links.map(link => { const contact = data.contacts.find(c => c.id === link.contactId); return <div className="list-row" key={link.id}><div className="list-main"><div className="list-title">{contact?.name}</div><div className="list-meta">{[contact?.address1, contact?.city, contact?.state, contact?.zip].filter(Boolean).join(', ') || 'No service address'}</div></div><Checkbox label="Service" checked={link.service} onChange={v => updateCaseContact(link.id, { service: v })} /></div> }) : <div className="tiny">No contacts in this case. Add parties and counsel first.</div>}
  </Dialog>
}

function NoteDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, createNote, updateNote } = useWorkspace()
  const { toast } = useUi()
  const caseId = S(payload.caseId)
  const note = payload.noteId ? data.notes.find(n => n.id === S(payload.noteId)) : undefined
  const [title, setTitle] = useState(note?.title || '')
  const [body, setBody] = useState(note?.body || '')
  const docs = data.documents.filter(d => d.caseId === caseId && !d.deletedAt)
  const auths = data.caseAuthorities.filter(l => l.caseId === caseId)
  const exs = data.exhibits.filter(e => e.caseId === caseId && !e.deletedAt)
  const [links, setLinks] = useState<{ type: 'Document' | 'Authority' | 'Exhibit'; id: string; label: string }[]>(note?.links || [])
  return <Dialog title={note ? 'Edit note' : 'New note'} subtitle="Link the note to a draft, authority, or exhibit. Links stay inside this case." onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!title.trim()} onClick={() => { if (note) updateNote(note.id, { title, body, links }); else createNote(caseId, title, body, links); close(); toast('Note saved.', { tone: 'success' }) }}>Save note</Button></>}>
    <Field label="Title" required><TextInput value={title} onChange={e => setTitle(e.target.value)} autoFocus /></Field>
    <Field label="Note" hint="Free-form. Use plain language; the reading font is Cambria."><TextArea value={body} onChange={e => setBody(e.target.value)} style={{ minHeight: 180 }} /></Field>
    <div>
      <div className="section-title">Link an object</div>
      <div className="row-wrap">
        <Select defaultValue="" onChange={e => { const value = e.target.value; if (!value) return; const [type, id] = value.split('|'); const match = type === 'Document' ? docs.find(d => d.id === id) : type === 'Authority' ? auths.find(l => l.id === id) : exs.find(ex => ex.id === id); if (match) setLinks(prev => [...prev, { type: type as 'Document', id, label: type === 'Document' ? (match as typeof docs[number]).title : type === 'Exhibit' ? `Ex. ${(match as typeof exs[number]).number}` : data.authorities.find(a => a.id === (match as typeof auths[number]).authorityId)?.caseName || 'Authority' }]) }} style={{ maxWidth: 280 }}><option value="">Choose an object…</option>{docs.map(d => <option key={d.id} value={`Document|${d.id}`}>Draft: {d.title}</option>)}{auths.map(l => { const a = data.authorities.find(x => x.id === l.authorityId); return a ? <option key={l.id} value={`Authority|${l.id}`}>Authority: {a.caseName}</option> : null })}{exs.map(ex => <option key={ex.id} value={`Exhibit|${ex.id}`}>Exhibit {ex.number}: {ex.title}</option>)}</Select>
      </div>
      <div className="note-links" style={{ marginTop: 6 }}>{links.map(l => <span className="note-link" key={`${l.type}-${l.id}`}>{l.type}: {l.label} <button className="linkish" onClick={() => setLinks(prev => prev.filter(x => !(x.type === l.type && x.id === l.id)))}>remove</button></span>)}</div>
    </div>
  </Dialog>
}

function FindDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, updateDocument } = useWorkspace()
  const { toast } = useUi()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [matches, setMatches] = useState<number | null>(null)
  if (!doc) return null
  const count = doc.blocks.reduce((sum, b) => sum + (find ? b.text.toLowerCase().split(find.toLowerCase()).length - 1 : 0), 0)
  return <Dialog title="Find and Replace" onClose={close} footer={<><Button onClick={close}>Close</Button><Button variant="ghost" disabled={!find} onClick={() => { const next = doc.blocks.map(b => ({ ...b, text: b.text.split(find).join(replace) })); updateDocument(doc.id, { blocks: next }); toast(`${count} replacement${count === 1 ? '' : 's'} made.`, { tone: 'success' }); close() }}>Replace all</Button></>} width="560px">
    <div className="form-grid"><Field label="Find"><TextInput value={find} onChange={e => setFind(e.target.value)} autoFocus /></Field><Field label="Replace with"><TextInput value={replace} onChange={e => setReplace(e.target.value)} /></Field></div>
    <div className="field-hint">{count} match{count === 1 ? '' : 'es'} in paragraphs, headings, and quotes. Generated tables are not text.</div>
    <Button onClick={() => { setMatches(count); const first = doc.blocks.find(b => b.text.toLowerCase().includes(find.toLowerCase())); if (first) window.dispatchEvent(new CustomEvent('lmt:focus-block', { detail: first.id })) }}>Find next</Button>
    {matches !== null ? <span className="tiny" style={{ marginLeft: 8 }}>{matches} matches</span> : null}
  </Dialog>
}

function HistoryDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, saveDocumentVersion, restoreDocumentVersion } = useWorkspace()
  const { toast } = useUi()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  const [note, setNote] = useState('')
  if (!doc) return null
  return <Dialog title="Version History" subtitle={doc.title} onClose={close} width="700px" footer={<><Button onClick={close}>Close</Button><Button variant="primary" onClick={() => { saveDocumentVersion(doc.id, note || 'Manual version'); setNote(''); toast('Version saved.', { tone: 'success' }) }}>Save current version</Button></>}>
    <div className="row"><TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="Version note (optional)" /><Button onClick={() => { saveDocumentVersion(doc.id, note || 'Manual version'); setNote('') }}>Save version</Button></div>
    {doc.versions.length ? doc.versions.map(v => <div className="list-row" key={v.id}><div className="list-main"><div className="list-title">{v.note || 'Version'}</div><div className="list-meta"><span>{formatDate(v.at)}</span><span>{v.title}</span></div></div><div className="row"><Button size="sm" variant="ghost" onClick={() => toast('Restoring replaces the current text; a copy of the current version is saved first.', { tone: 'info' })}>Preview</Button><Button size="sm" onClick={() => { restoreDocumentVersion(doc.id, v.id); close(); toast('Version restored. The previous text is in History.', { tone: 'success' }) }}>Restore</Button></div></div>) : <div className="tiny">No versions yet. Ctrl+S saves one.</div>}
  </Dialog>
}

function CompareDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data } = useWorkspace()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  if (!doc || !doc.versions.length) return <InfoDialog title="Compare" close={close} body={<p>There are no saved versions to compare yet. Use Ctrl+S to save one.</p>} />
  const version = doc.versions[0]
  return <Dialog title="Compare versions" subtitle={`${version.note || 'Latest version'} · ${formatDate(version.at)}`} onClose={close} width="900px" footer={<Button onClick={close}>Close</Button>}>
    <div className="two-col">
      <div className="panel panel-body"><strong className="small">Saved version</strong>{version.body.map(b => <p key={b.id} style={{ fontSize: 13, marginTop: 6 }}>{b.text || '(empty)'}</p>)}</div>
      <div className="panel panel-body"><strong className="small">Current</strong>{doc.blocks.map(b => <p key={b.id} style={{ fontSize: 13, marginTop: 6 }}>{b.text || '(empty)'}</p>)}</div>
    </div>
  </Dialog>
}

function QuickCheckDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data } = useWorkspace()
  const doc = data.documents.find(d => d.id === S(payload.docId))
  if (!doc) return null
  const scan = scanDocument(data, doc)
  const words = doc.blocks.map(b => b.text).join(' ').split(/\s+/).filter(Boolean).length
  const checks = [
    { label: 'Caption block', pass: doc.blocks.some(b => b.type === 'caption') },
    { label: 'Certificate of service', pass: doc.blocks.some(b => b.type === 'certificateOfService') },
    { label: 'All citations verified', pass: scan.unverifiedCount === 0 && scan.flaggedCount === 0 },
    { label: 'Every citation has a record', pass: scan.rawCount === 0 },
    { label: 'Pinpoints for cited authority', pass: !scan.findings.some(f => f.kind === 'missing-pinpoint') },
    { label: 'No broken exhibit references', pass: !scan.findings.some(f => f.kind === 'broken-exhibit') },
    { label: 'Length', pass: words < 12000, note: `${words.toLocaleString()} words` },
  ]
  return <Dialog title="Quick Check" subtitle="A checklist, not a judgment on the argument." onClose={close} footer={<Button variant="primary" onClick={close}>Done</Button>}>
    <div className="preflight-list">{checks.map((c, i) => <div className="preflight-row" key={i}><div className="grow"><div className="check-label">{c.label}</div>{c.note ? <div className="check-detail">{c.note}</div> : null}</div><Status state={c.pass ? 'Passed' : 'Failed'} /></div>)}</div>
    <div className="field-hint">Quick Check is a version 1.1 item implemented here as a checklist. It reads citation status, pinpoints, required sections, and length. It does not evaluate the argument.</div>
  </Dialog>
}

function DeleteDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, moveToTrash } = useWorkspace()
  const { toast } = useUi()
  const objectType = S(payload.objectType) as import('../core/types').TrashObjectType
  const objectId = S(payload.objectId)
  const matter = data.cases.find(c => c.id === objectId)
  const docRefs = objectType === 'Exhibit' ? data.documents.filter(d => d.blocks.some(b => b.text.includes(`{{ex:${objectId}`))) : []
  const [typed, setTyped] = useState('')
  const name = objectType === 'Case' ? matter?.caption : objectType === 'Document' ? data.documents.find(d => d.id === objectId)?.title : objectType === 'Exhibit' ? `Exhibit ${data.exhibits.find(e => e.id === objectId)?.number}` : objectType === 'Note' ? data.notes.find(n => n.id === objectId)?.title : objectType === 'Filing' ? 'Filing draft' : objectType === 'Deadline' ? data.deadlines.find(d => d.id === objectId)?.title : ''
  const upcoming = matter ? data.deadlines.filter(d => d.caseId === matter.id && deadlineDate(d) >= todayIso()) : []
  return <Dialog title={`Move to Recently Deleted`} onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="danger" disabled={objectType === 'Case' && typed !== matter?.number} onClick={() => { const trashId = moveToTrash(objectType, objectId); const id = toast(`Moved “${name || objectType}” to Recently Deleted.`, { tone: 'info', action: { label: 'Undo', onClick: () => useUndo(trashId) } }); close() }}>Move to Recently Deleted</Button></>}>
    {objectType === 'Case' ? <><p>This case has {upcoming.length} upcoming deadline{upcoming.length === 1 ? '' : 's'}. Deleting a case moves it to Recently Deleted; it is not permanently removed automatically.</p><Field label={`Type the case number to confirm: ${matter?.number || ''}`} required><TextInput value={typed} onChange={e => setTyped(e.target.value)} /></Field></> : <p>“{name || `This ${objectType.toLowerCase()}`}” will move to Recently Deleted and can be restored for {data.settings.retentionDays} days.</p>}
    {objectType === 'Filing' ? <div className="session-warning">Only draft filings can be deleted. Filed records are archived, never deleted.</div> : null}
    {docRefs.length ? <div className="session-warning">{docRefs.length} document{docRefs.length === 1 ? '' : 's'} reference this exhibit. Its citations will show as broken until it is restored. {docRefs.map(d => d.title).join(', ')}</div> : null}
    <div className="field-hint">Deleting text never deletes a record. Deleting an authority marks affected citations Unverified.</div>
  </Dialog>
}

function useUndo(trashId: string) {
  // The Undo toast needs the store outside React's render; this shim dispatches to a listener in App.
  window.dispatchEvent(new CustomEvent('lmt:restore-trash', { detail: trashId }))
}

function PurgeDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { data, purgeTrash } = useWorkspace()
  const { toast } = useUi()
  const item = data.trash.find(t => t.id === S(payload.trashId))
  const [typed, setTyped] = useState('')
  if (!item) return null
  return <Dialog title="Delete permanently" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="danger" disabled={typed !== 'DELETE'} busy={false} onClick={async () => { await purgeTrash(item.id); close(); toast('Permanently deleted. Earlier backups may still contain this item.', { tone: 'danger' }) }}>Delete permanently</Button></>}>
    <p>“{item.name}” will be permanently deleted. This cannot be undone.</p>
    <div className="session-warning">Permanent deletion is logged with the item type and name. Earlier backups may still contain the item. {item.objectType === 'Case' ? 'The entire case and its records will be removed.' : ''}</div>
    <Field label='Type DELETE to confirm' required><TextInput value={typed} onChange={e => setTyped(e.target.value)} /></Field>
  </Dialog>
}

function BackupDialog({ payload, close }: { payload: Record<string, unknown>; close: () => void }) {
  const { backupNow, restoreFromBackupFile } = useWorkspace()
  const { toast } = useUi()
  const [passphrase, setPassphrase] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [restorePass, setRestorePass] = useState('')
  const [busy, setBusy] = useState(false)
  const restoring = Boolean(payload.restore)
  if (restoring) return <Dialog title="Restore from backup" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="danger" busy={busy} disabled={!file || !restorePass} onClick={async () => { if (!file) return; setBusy(true); try { await restoreFromBackupFile(await file.text(), restorePass); close(); toast('Backup restored.', { tone: 'success' }) } catch (err) { toast(err instanceof Error ? err.message : 'The backup could not be restored.', { tone: 'danger' }) } finally { setBusy(false) } }}>Restore workspace</Button></>}>
    <div className="session-warning">Restoring replaces the current workspace. Make a backup of the current workspace first if you may need it.</div>
    <Field label="Backup file"><TextInput type="file" accept=".json,.matter-backup,application/json" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
    <Field label="Backup passphrase"><TextInput type="password" value={restorePass} onChange={e => setRestorePass(e.target.value)} /></Field>
  </Dialog>
  return <Dialog title="Create encrypted backup" onClose={close} footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" busy={busy} disabled={passphrase.length < 8} onClick={async () => { setBusy(true); try { const blob = await backupNow(passphrase); downloadBlob(blob, `matter-backup-${todayIso()}.matter-backup`); close(); toast('Encrypted backup created. Store it somewhere safe.', { tone: 'success' }) } catch (err) { toast(err instanceof Error ? err.message : 'The backup could not be created.', { tone: 'danger' }) } finally { setBusy(false) } }}>Create backup</Button></>}>
    <p>Back up the encrypted database and every stored document. The backup gets its own passphrase, separate from this browser's store, so it can be restored on another machine.</p>
    <Field label="Backup passphrase" hint="At least 8 characters. This cannot be recovered." required><TextInput type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} /></Field>
    <div className="session-warning">Store the backup away from this computer. Test a restore before relying on it.</div>
  </Dialog>
}

function InfoDialog({ title, close, body }: { title: string; close: () => void; body: import('react').ReactNode }) {
  return <Dialog title={title} onClose={close} footer={<Button variant="primary" onClick={close}>Close</Button>}>{body}</Dialog>
}

function ShortcutTable() {
  const rows = [['Ctrl+Shift+P','Command search'],['Ctrl+S','Save'],['Ctrl+N','New document'],['Ctrl+Shift+N','New case'],['Ctrl+F / Ctrl+H','Find / Replace'],['Ctrl+Shift+F','Find across case'],['Ctrl+Shift+A','Cite selected text'],['Ctrl+Shift+E','Exhibit cross-reference'],['Ctrl+Alt+F','Start filing'],['Ctrl+Alt+P','Preflight'],['Ctrl+Alt+N / Ctrl+Alt+S','Navigation Pane / Side Panel'],['Ctrl+1 … Ctrl+8','Case sections'],['Delete','Move to Recently Deleted'],['Shift+Delete','Delete permanently from Recently Deleted'],['Ctrl+Z / Ctrl+Y','Undo / Redo']]
  return <div className="table-wrap"><table className="data-table"><tbody>{rows.map(([key, action]) => <tr key={key}><td style={{ width: 220 }}><span className="kbd">{key}</span></td><td>{action}</td></tr>)}</tbody></table></div>
}

function AboutBody() {
  return <div className="stack"><p><strong>Legal Matter Workspace 1.0</strong></p><p>One case holds its drafts, research, exhibits, deadlines, filings, people, and notes. Data is stored locally in an encrypted store on this computer. The app sends no telemetry.</p><p>The web build uses this browser profile for encrypted local storage. The Windows build ships as a per-user installer with the data folder chosen at setup.</p><p>Not integrated: eFile &amp; Serve submission, Westlaw, citators, AI drafting, cloud sync. Filing remains the attorney’s act in eFile &amp; Serve.</p><p>Sample authority records are examples; verify every citation before relying on it.</p></div>
}

function HelpBody() {
  return <div className="stack"><p><strong>Start a case.</strong> File &gt; New Case. Enter the caption, court, number, role, parties, and a trigger event. Deadlines are calculated from the rules.</p><p><strong>Draft.</strong> Open Documents and choose a template. Select a sentence and choose Cite (Ctrl+Shift+A) or Exhibit (Ctrl+Shift+E). Mark a citation Verified after checking it elsewhere.</p><p><strong>File.</strong> Filing &gt; New Filing. Choose eFile Only, eFile and Serve, or Serve Only. Preflight runs on the filing. Stage Filing builds the packet. Submit in eFile &amp; Serve, then Record Filing Result.</p><p><strong>Recover.</strong> Deleted items wait in Recently Deleted. Permanent deletion is logged and may still exist in earlier backups.</p><p>Full product specification is in AGENTS.md.</p></div>
}
