import { useRef, useState } from 'react'
import { useStore } from '../core/store'
import { passphraseStrength } from '../core/crypto'
import { Button, Field, Icon, TextInput } from '../ui/kit'

export function LoadingScreen({ error }: { error?: string | null }) {
  return (
    <div className="boot">
      <Icon name="shield" size={26} />
      <div>{error ? 'The local workspace could not be opened.' : 'Opening the local workspace…'}</div>
      {error ? <div className="session-warning" style={{ maxWidth: 460 }}>{error}</div> : null}
    </div>
  )
}

export function SetupScreen() {
  const { setup } = useStore()
  const [name, setName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [folder, setFolder] = useState('Documents\\Legal Matter Workspace')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const strength = passphraseStrength(passphrase)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter the name that should appear in the audit log.')
    if (passphrase.length < 8) return setError('Use at least 8 characters for the passphrase.')
    if (passphrase !== confirm) return setError("The passphrases don't match.")
    setBusy(true)
    const result = await setup(passphrase, name, folder)
    setBusy(false)
    if (result) setError(result)
  }

  return (
    <div className="session">
      <div className="session-brand">
        <div>
          <div className="brand-mark"><Icon name="shield" size={18} /> Legal Matter Workspace</div>
          <div className="session-lead" style={{ marginTop: 48 }}>
            <h1>One case. One place.</h1>
            <p>
              Drafts, research, exhibits, deadlines, and filings stay together in a single local workspace.
              Nothing leaves this computer without your approval.
            </p>
            <div className="session-points">
              <div className="session-point"><Icon name="check" /> Deadlines calculated from editable Vermont appellate rules</div>
              <div className="session-point"><Icon name="check" /> Citations stay linked to saved authorities and their status</div>
              <div className="session-point"><Icon name="check" /> Preflight checks before filing, with logged overrides only</div>
              <div className="session-point"><Icon name="check" /> AES-256 local store, encrypted backups, append-only audit log</div>
            </div>
          </div>
        </div>
        <div className="tiny">Version 1.0 · Local-first · No telemetry</div>
      </div>
      <div className="session-form-wrap">
        <form className="session-form" onSubmit={submit}>
          <h2>Set up this workspace</h2>
          <p className="sub">The passphrase unlocks the encrypted database and documents on this computer.</p>
          <div className="stack">
            <Field label="Your name" hint="Appears in the audit log." required>
              <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice M. Reed" autoFocus />
            </Field>
            <Field label="Passphrase" hint={passphrase ? `Strength: ${strength.label}` : 'At least 8 characters.'} required>
              <TextInput type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm passphrase" required>
              <TextInput type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Data folder" hint="Where this app keeps its encrypted stores on this computer.">
              <TextInput value={folder} onChange={e => setFolder(e.target.value)} />
            </Field>
            <div className="session-warning">
              A lost passphrase cannot be recovered. There is no reset. Store it with the same care as the case files.
              Enable BitLocker on the drive that holds the data folder.
            </div>
            {error ? <div className="session-warning" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>{error}</div> : null}
            <Button type="submit" variant="primary" busy={busy}>Create workspace</Button>
          </div>
          <div className="session-foot"><span>Local only</span><span>Encrypted with AES-256-GCM</span></div>
        </form>
      </div>
    </div>
  )
}

export function UnlockScreen() {
  const { unlock, restoreFromBackupFile } = useStore()
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restorePass, setRestorePass] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await unlock(passphrase)
    setBusy(false)
    if (result) setError(result)
  }

  const doRestore = async (file: File) => {
    setRestoreError(null)
    if (!restorePass) return setRestoreError('Enter the passphrase used when the backup was made.')
    setBusy(true)
    try {
      const text = await file.text()
      await restoreFromBackupFile(text, restorePass)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'The backup could not be restored.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="session">
      <div className="session-brand">
        <div>
          <div className="brand-mark"><Icon name="shield" size={18} /> Legal Matter Workspace</div>
          <div className="session-lead" style={{ marginTop: 48 }}>
            <h1>Welcome back.</h1>
            <p>The workspace is locked on this computer. Your passphrase unlocks the encrypted store locally. No server is contacted.</p>
          </div>
        </div>
        <div className="tiny">Data stays on this machine · No telemetry</div>
      </div>
      <div className="session-form-wrap">
        <form className="session-form" onSubmit={submit}>
          <h2>Unlock</h2>
          <p className="sub">Enter the passphrase set at setup.</p>
          <div className="stack">
            <Field label="Passphrase">
              <TextInput type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} autoFocus autoComplete="current-password" />
            </Field>
            {error ? <div className="session-warning" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>{error}</div> : null}
            <Button type="submit" variant="primary" busy={busy}>Unlock workspace</Button>
            <button type="button" className="linkish" style={{ alignSelf: 'flex-start' }} onClick={() => setRestoring(v => !v)}>
              Restore from an encrypted backup
            </button>
            {restoring ? (
              <div className="panel panel-body stack">
                <Field label="Backup file" hint=".matter-backup file made by this app.">
                  <input className="input" type="file" accept=".json,.matter-backup,application/json" ref={fileRef} disabled={busy} />
                </Field>
                <Field label="Backup passphrase">
                  <TextInput type="password" value={restorePass} onChange={e => setRestorePass(e.target.value)} />
                </Field>
                {restoreError ? <div className="session-warning">{restoreError}</div> : null}
                <Button
                  type="button"
                  variant="secondary"
                  busy={busy}
                  onClick={() => {
                    const file = fileRef.current?.files?.[0]
                    if (file) void doRestore(file)
                  }}
                >
                  Restore and unlock
                </Button>
                <div className="field-hint">Restoring replaces the workspace in this browser profile. Existing encrypted data is overwritten.</div>
              </div>
            ) : null}
          </div>
          <div className="session-foot"><span>Lost passphrase = no recovery</span><span>AES-256 · PBKDF2</span></div>
        </form>
      </div>
    </div>
  )
}

