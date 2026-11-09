import { useState } from 'react'
import { useWorkspace } from '../core/store'
import { useUi } from '../ui/ui'
import { Button, Field, Icon, PageHeader, Select, TextArea, TextInput, Checkbox, Badge } from '../ui/kit'
import { formatDateTime, todayIso } from '../core/util'
import { navigateTo } from '../ui/router'
import type { AuditAction } from '../core/types'

export function SettingsView() {
  const { data, updateSettings, updateApprovedService, changePassphrase } = useWorkspace()
  const { openDialog, toast } = useUi()
  const s = data.settings
  const [retention, setRetention] = useState(String(s.retentionDays))
  const [lock, setLock] = useState(String(s.autoLockMinutes))
  const [holidays, setHolidays] = useState(s.courtHolidays.join('\n'))
  const [attorneys, setAttorneys] = useState(s.filingAttorneys.join('\n'))
  const [codes, setCodes] = useState(s.filingCodes.join('\n'))
  const [accounts, setAccounts] = useState(s.paymentAccounts.join('\n'))
  const [efile, setEfile] = useState(s.efileUrl)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [passError, setPassError] = useState<string | null>(null)
  const [serviceTokens, setServiceTokens] = useState<Record<string, string>>(
    Object.fromEntries(s.approvedServices.map(x => [x.id, x.token])),
  )

  const saveList = (key: 'courtHolidays' | 'filingAttorneys' | 'filingCodes' | 'paymentAccounts', value: string) =>
    updateSettings({ [key]: value.split('\n').map(v => v.trim()).filter(Boolean) })

  return (
    <div className="page">
      <PageHeader title="Options" subtitle="Local settings. Nothing here is sent anywhere." actions={<Button onClick={() => openDialog('shortcuts')}>Keyboard shortcuts</Button>} />
      <div className="settings-grid">
        <section className="settings-section">
          <div className="settings-section-head"><h2>Security</h2><p>Auto-lock, passphrase, and where the data lives.</p></div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div><h3>Auto-lock</h3><p>The workspace locks after this many minutes without activity. The default is 15.</p></div>
              <div className="row"><TextInput type="number" min={1} max={240} value={lock} onChange={e => setLock(e.target.value)} style={{ width: 90 }} /><Button onClick={() => { updateSettings({ autoLockMinutes: Math.max(1, Number(lock) || 15) }); toast('Auto-lock updated.', { tone: 'success' }) }}>Save</Button></div>
            </div>
            <div className="settings-row">
              <div><h3>Data folder</h3><p>Application data stays on this computer. In the Windows build this is the encrypted store location; the browser build uses this browser profile's encrypted local storage.</p></div>
              <TextInput value={s.dataFolder} onChange={e => updateSettings({ dataFolder: e.target.value })} aria-label="Data folder" />
            </div>
            <div className="settings-row">
              <div><h3>Change passphrase</h3><p>Re-encrypts the database and every stored file. A lost passphrase cannot be recovered.</p></div>
              <div className="stack">
                <TextInput type="password" placeholder="Current passphrase" value={oldPass} onChange={e => setOldPass(e.target.value)} />
                <TextInput type="password" placeholder="New passphrase, 8+ characters" value={newPass} onChange={e => setNewPass(e.target.value)} />
                {passError ? <div className="field-hint" style={{ color: 'var(--danger)' }}>{passError}</div> : null}
                <Button onClick={async () => { setPassError(null); const err = await changePassphrase(oldPass, newPass); if (err) setPassError(err); else { setOldPass(''); setNewPass(''); toast('Passphrase changed and files re-encrypted.', { tone: 'success' }) } }}>Change passphrase</Button>
              </div>
            </div>
            <div className="settings-row">
              <div><h3>Interface size and motion</h3><p>Large is for people who prefer larger text. Motion follows Windows unless you turn it off here.</p></div>
              <div className="stack">
                <Select value={s.interfaceScale} onChange={e => { updateSettings({ interfaceScale: e.target.value as 'Default' | 'Large' }); document.documentElement.dataset.interfaceSize = e.target.value === 'Large' ? 'large' : 'default' }}><option>Default</option><option>Large</option></Select>
                <Select value={s.animations} onChange={e => { updateSettings({ animations: e.target.value as 'System' | 'On' | 'Off' }); document.documentElement.dataset.motion = e.target.value === 'Off' ? 'off' : 'system' }}><option>System</option><option>On</option><option>Off</option></Select>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head"><h2>Recently Deleted</h2><p>Items are kept for 7 to 90 days. Cases are never removed automatically.</p></div>
          <div className="settings-section-body">
            <div className="settings-row">
              <div><h3>Retention</h3><p>After this many days, deleted items are removed when the workspace is unlocked. Permanent deletions are logged with type and name.</p></div>
              <div className="row"><TextInput type="number" min={7} max={90} value={retention} onChange={e => setRetention(e.target.value)} style={{ width: 90 }} /><Button onClick={() => { updateSettings({ retentionDays: Number(retention) || 30 }); toast('Retention updated.', { tone: 'success' }) }}>Save</Button></div>
            </div>
            <div className="settings-row">
              <div><h3>Backups</h3><p>Encrypted with the passphrase. Store a copy on an external drive and test a restore.</p></div>
              <div className="stack">
                <div className="tiny">Last backup: {s.backups.lastBackupAt ? formatDateTime(s.backups.lastBackupAt) : 'Never'}</div>
                <Button onClick={() => openDialog('backup')}>Create encrypted backup</Button>
                <Button variant="ghost" onClick={() => openDialog('backup', { restore: true })}>Restore from backup</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head"><h2>Filing defaults</h2><p>Fields Odyssey asks for. Confirm current filing codes and fees with the court (OQ-2).</p></div>
          <div className="settings-section-body">
            <div className="settings-row"><div><h3>Filing codes</h3><p>Suggestions only. Enter the exact code shown in eFile &amp; Serve.</p></div><TextArea value={codes} onChange={e => setCodes(e.target.value)} onBlur={() => saveList('filingCodes', codes)} /></div>
            <div className="settings-row"><div><h3>Filing attorneys</h3><p>One per line. The first is the default.</p></div><TextArea value={attorneys} onChange={e => setAttorneys(e.target.value)} onBlur={() => saveList('filingAttorneys', attorneys)} /></div>
            <div className="settings-row"><div><h3>Payment accounts</h3><p>One per line. Labels only; no payment data is stored.</p></div><TextArea value={accounts} onChange={e => setAccounts(e.target.value)} onBlur={() => saveList('paymentAccounts', accounts)} /></div>
            <div className="settings-row"><div><h3>eFile &amp; Serve address</h3><p>Opened in the default browser. The app does not submit filings.</p></div><TextInput value={efile} onChange={e => setEfile(e.target.value)} onBlur={() => updateSettings({ efileUrl: efile })} /></div>
            <div className="settings-row"><div><h3>Court holidays</h3><p>One date per line (YYYY-MM-DD). Weekends and these dates roll deadlines to the next business day when the rule says so.</p></div><TextArea value={holidays} onChange={e => setHolidays(e.target.value)} onBlur={() => saveList('courtHolidays', holidays)} placeholder={todayIso()} /></div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head"><h2>Approved services</h2><p>No connection carries client content until you record its data terms and approve it.</p></div>
          <div className="settings-section-body">
            {s.approvedServices.map(service => (
              <div className="service-card" key={service.id}>
                <div className="service-head"><div><strong>{service.name}</strong><div className="tiny">{service.purpose}</div></div><Badge tone={service.approved ? 'success' : 'neutral'}>{service.approved ? 'Approved' : 'Not approved'}</Badge></div>
                <div className="field-hint" style={{ marginTop: 8 }}>{service.dataTerms}</div>
                {service.id === 'svc_courtlistener' ? (
                  <div className="field-hint" style={{ marginTop: 6 }}>
                    Free API token: <a href="https://www.courtlistener.com/profile/api-token/" target="_blank" rel="noreferrer">CourtListener profile</a>. Paste it below, save it, then approve the service.
                  </div>
                ) : null}
                {service.endpoint ? (
                  <div className="row" style={{ marginTop: 8 }}>
                    <TextInput type="password" placeholder="API token (stored encrypted)" value={serviceTokens[service.id] ?? ''} onChange={e => setServiceTokens(prev => ({ ...prev, [service.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => { updateApprovedService(service.id, { token: serviceTokens[service.id] ?? '' }); toast('Token saved in the encrypted store.', { tone: 'success' }) }}>Save token</Button>
                  </div>
                ) : null}
                <Checkbox label="I have reviewed this service's data terms and approve it" checked={service.approved} onChange={v => updateApprovedService(service.id, { approved: v })} />
                {service.approvedAt ? <div className="tiny">Approved {formatDateTime(service.approvedAt)}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head"><h2>About</h2><p>Version 1.0 · Local-first · No telemetry.</p></div>
          <div className="settings-section-body">
            <div className="row-wrap"><Button onClick={() => openDialog('about')}>About this build</Button><Button onClick={() => openDialog('help')}>Help topics</Button><Button variant="ghost" onClick={() => navigateTo({ view: 'audit' })}>Audit Log</Button><Button variant="ghost" onClick={() => openDialog('shortcuts')}>Shortcuts</Button></div>
            <div className="field-hint">Archive and backups are designed for a single attorney on one computer. Signing and installer work are outside this web build.</div>
          </div>
        </section>
      </div>
    </div>
  )
}

export function AuditLogView() {
  const { data } = useWorkspace()
  const [action, setAction] = useState('All')
  const actions = Array.from(new Set(data.audit.map(e => e.action))).sort()
  const rows = data.audit.filter(e => action === 'All' || e.action === action).slice(0, 500)
  return (
    <div className="page">
      <PageHeader title="Audit Log" subtitle="Append-only. Records opens, edits, exports, filings, and deletions with user, time, and object." actions={<Button onClick={() => navigateTo({ view: 'settings' })}>Options</Button>} />
      <div className="audit-filter">
        <Select value={action} onChange={e => setAction(e.target.value)} style={{ width: 200 }}><option>All</option>{actions.map(a => <option key={a}>{a}</option>)}</Select>
        <span className="tiny">{data.audit.length} events · showing {rows.length}</span>
      </div>
      <div className="panel panel-body flush table-wrap">
        <table className="data-table audit-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Object</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map(e => (
              <tr key={e.id}><td className="nowrap tabular">{formatDateTime(e.at)}</td><td>{e.user}</td><td><Badge tone={e.action === 'Permanent delete' ? 'danger' : e.action === 'Filing result' || e.action === 'Export' ? 'info' : 'neutral'}>{e.action}</Badge></td><td>{e.objectType}{e.objectName ? <div className="audit-detail">{e.objectName}</div> : null}</td><td className="audit-detail">{e.detail || '—'}</td></tr>
            ))}
            {!rows.length ? <tr><td colSpan={5} className="table-empty">No audit events match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
