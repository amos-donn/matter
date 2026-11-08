import { useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from '../ui/ui'
import { Badge, Button, EmptyState, Icon, Status } from '../ui/kit'
import { runPreflight, preflightSummary, selectedContactDetails } from '../core/preflight'
import { formatDateTime, formatShortDate, downloadBlob } from '../core/util'
import type { Filing } from '../core/types'

export function FilingsSection({ caseId }: { caseId: string }) {
  const { data, readFileBytes } = useWorkspace()
  const { openDialog, toast } = useUi()
  const [expanded, setExpanded] = useState<string | null>(null)
  const matter = data.cases.find(c => c.id === caseId)!
  const filings = data.filings.filter(f => f.caseId === caseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const locked = (f: Filing) => ['Submitted', 'Accepted', 'Rejected', 'Served'].includes(f.status)

  const downloadPacket = async (filing: Filing) => {
    const packet = filing.stagedFiles.find(s => s.kind === 'Packet' && s.fileId)
    if (!packet?.fileId) return toast('Stage the filing first to build the packet.')
    const bytes = await readFileBytes(packet.fileId)
    if (bytes) downloadBlob(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }), packet.name)
  }

  return (
    <div className="panel panel-body flush">
      <div className="panel-head"><div className="panel-title">{filings.length} filings</div><Button size="sm" variant="primary" icon="add" onClick={() => openDialog('new-filing', { caseId })}>New Filing</Button></div>
      {filings.length ? filings.map(filing => {
        const doc = data.documents.find(d => d.id === filing.documentId)
        const preflight = runPreflight(data, filing, matter, doc)
        const open = expanded === filing.id
        return (
          <div className="filing-row" key={filing.id}>
            <div className="filing-head" onClick={() => setExpanded(open ? null : filing.id)}>
              <Status state={filing.status} />
              <div className="filing-head-main">
                <div className="filing-title">{filing.filingCode || 'Untitled filing'} <Badge tone="outline">{filing.type}</Badge>{filing.underSeal ? <Badge tone="warn">Under seal</Badge> : null}{filing.limitedAppearance ? <Badge tone="outline">Limited appearance</Badge> : null}</div>
                <div className="filing-meta"><span>{doc?.title || 'Draft missing'}</span><span>{filing.envelopeNumber ? `Envelope ${filing.envelopeNumber}` : 'No envelope yet'}</span><span>{filing.stagedAt ? `Staged ${formatShortDate(filing.stagedAt)}` : 'Not staged'}</span>{preflight.failed ? <span style={{ color: 'var(--danger)' }}>{preflight.failed} preflight issue{preflight.failed === 1 ? '' : 's'}</span> : <span style={{ color: 'var(--ok)' }}>{preflightSummary(preflight)}</span>}</div>
              </div>
              <Icon name={open ? 'chevron-down' : 'chevron-right'} />
            </div>
            {open ? (
              <div className="filing-detail">
                <div className="filing-facts">
                  <div><div className="fact-label">Filing type</div><div className="fact-value">{filing.type}</div></div>
                  <div><div className="fact-label">Filing code</div><div className="fact-value">{filing.filingCode || 'Missing'}</div></div>
                  <div><div className="fact-label">Fees</div><div className="fact-value">{filing.fees || '—'}</div></div>
                  <div><div className="fact-label">Payment account</div><div className="fact-value">{filing.paymentAccount || '—'}</div></div>
                  <div><div className="fact-label">Filing attorney</div><div className="fact-value">{filing.filingAttorney || 'Missing'}</div></div>
                  <div><div className="fact-label">Additional attorneys</div><div className="fact-value">{filing.additionalAttorneys || '—'}</div></div>
                </div>
                <div>
                  <div className="section-title" style={{ marginTop: 0 }}>Service contacts</div>
                  {selectedContactDetails(data, filing).length ? selectedContactDetails(data, filing).map(({ contact }) => <div key={contact.id} className="tiny">{contact.name}{contact.address1 ? ` — ${contact.address1}, ${contact.city}, ${contact.state} ${contact.zip}` : ' — NO ADDRESS'}</div>) : <div className="tiny">No recipients selected.</div>}
                </div>
                <div>
                  <div className="section-title" style={{ marginTop: 0 }}>Preflight</div>
                  <div className="preflight-list">
                    {preflight.checks.map(check => (
                      <div className="preflight-row" key={check.id}>
                        <div className="grow"><div className="check-label">{check.label}</div><div className="check-detail">{check.detail}</div></div>
                        <div className="preflight-state">
                          <Status state={check.state} />
                          {check.state === 'Failed' && check.overridable && !locked(filing) ? <Button size="sm" variant="ghost" onClick={() => openDialog('preflight', { filingId: filing.id, checkId: check.id })}>Override</Button> : null}
                          {check.state === 'Failed' && check.action ? <Button size="sm" variant="ghost" onClick={() => openDialog('deferred', { title: check.action!.label, body: `Resolve this in the case, then return to the filing. ${check.detail}` })}>Go to</Button> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="tiny" style={{ marginTop: 6 }}>Preflight does not submit anything. Failures block staging unless an override is logged.</div>
                </div>
                {filing.stagedFiles.length ? (
                  <div>
                    <div className="section-title" style={{ marginTop: 0 }}>Staged packet</div>
                    <div className="packet-files">
                      {filing.stagedFiles.map(file => <div className="packet-file" key={file.name}><span>{file.name}</span><span className="tiny">{file.kind}{file.note ? ` · ${file.note}` : ''}</span></div>)}
                    </div>
                    <div className="field-hint">In the Windows build the packet is written to the staging folder. Here it downloads as a ZIP.</div>
                  </div>
                ) : null}
                {filing.history.length ? <div><div className="section-title" style={{ marginTop: 0 }}>Result history</div>{filing.history.map((h, i) => <div className="tiny" key={i}>{formatDateTime(h.at)} · {h.status} · {h.note}</div>)}</div> : null}
                <div className="filing-actions">
                  {!locked(filing) ? <Button size="sm" onClick={() => openDialog('edit-filing', { filingId: filing.id })}>Edit filing</Button> : <Badge tone="outline">Filed record is locked</Badge>}
                  {!locked(filing) ? <Button size="sm" onClick={() => openDialog('stage-filing', { filingId: filing.id })}>Stage Filing</Button> : null}
                  <Button size="sm" onClick={() => { preflight; window.open(data.settings.efileUrl, '_blank', 'noopener') }}>Open eFile &amp; Serve</Button>
                  {filing.status !== 'Draft' ? <Button size="sm" onClick={() => openDialog('record-result', { filingId: filing.id })}>Record Filing Result</Button> : null}
                  {filing.stagedFiles.length ? <Button size="sm" variant="ghost" icon="download" onClick={() => void downloadPacket(filing)}>Download packet</Button> : null}
                  {filing.status === 'Draft' ? <Button size="sm" variant="ghost" onClick={() => openDialog('delete-confirm', { objectType: 'Filing', objectId: filing.id })}>Delete draft</Button> : null}
                </div>
              </div>
            ) : null}
          </div>
        )
      }) : <EmptyState icon="filing" title="No filings yet" body="Start a filing from a draft. Choose eFile Only, eFile and Serve, or Serve Only; confirm service contacts and the filing code; then run Preflight and Stage Filing. The app never submits to eFile & Serve." action={<Button variant="primary" onClick={() => openDialog('new-filing', { caseId })}>New Filing</Button>} />}
    </div>
  )
}
