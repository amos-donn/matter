import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  AuditAction,
  CaseContact,
  CaseNote,
  Citation,
  CitationStatus,
  Contact,
  ContactRole,
  ContactSource,
  CheckSource,
  Deadline,
  DeadlineRule,
  DocBlock,
  DocVersion,
  MatterCase,
  MatterDoc,
  Exhibit,
  Filing,
  FilingStatus,
  FilingType,
  NoteLink,
  Settings,
  StagedFile,
  TrashItem,
  TrashObjectType,
} from './types'
import { changePassphrase as rekeyVault, createBackup, persistVault, restoreBackup, unlockVault, createVault, saveFile, loadFile, removeFile, vaultExists } from './vault'
import { buildDeadlines, computeDeadlineDate, rulesForTrigger } from './deadlines'
import { docCitationUses } from './citations'
import { buildPacket, type PacketBuild } from '../export/packet'
import { nowIso, uid } from './util'
import { templateBlocks } from './seed'
import { RETENTION_MAX, RETENTION_MIN } from './constants'

type AppStatus = 'loading' | 'setup' | 'locked' | 'unlocked' | 'error'
type SaveState = 'saved' | 'saving' | 'error'

interface AuditSpec {
  action: AuditAction
  objectType: string
  objectId?: string
  objectName?: string
  detail?: string
}

export interface NewCaseInput {
  caption: string
  court: string
  number: string
  role: string
  clientId: string
  judge: string
  triggerLabel: string
  triggerDate: string
  parties: { name: string; designation: string }[]
}

export interface ContactInput {
  name: string
  organization: string
  roleTitle: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  email: string
  phone: string
  notes: string
  source: ContactSource
}

export interface FilingInput {
  caseId: string
  documentId: string
  type: FilingType
  filingCode: string
  fees: string
  paymentAccount: string
  filingAttorney: string
  additionalAttorneys: string
  underSeal: boolean
  limitedAppearance: boolean
  serviceContactIds: string[]
  exhibitIds: string[]
}

export interface RecordResultInput {
  status: FilingStatus
  envelopeNumber: string
  rejectionReason: string
  proof?: { name: string; bytes: Uint8Array } | null
}

export interface StagingOutcome {
  packet: PacketBuild
  zipFileId: string
  zipName: string
}

export interface StoreValue {
  status: AppStatus
  data: AppData | null
  bootError: string | null
  saveState: SaveState
  lastSavedAt: string | null
  setup: (passphrase: string, user: string, dataFolder: string) => Promise<string | null>
  unlock: (passphrase: string) => Promise<string | null>
  lock: () => Promise<void>
  changePassphrase: (current: string, next: string) => Promise<string | null>
  update: (mutator: (draft: AppData) => void, audit?: AuditSpec | AuditSpec[]) => void
  createCase: (input: NewCaseInput) => string
  updateCase: (id: string, patch: Partial<MatterCase>, detail?: string) => void
  setCaseStatus: (id: string, status: MatterCase['status']) => void
  pinCase: (id: string, pinned: boolean) => void
  addDeadlinesFromTrigger: (caseId: string, triggerLabel: string, triggerDate: string) => number
  overrideDeadline: (deadlineId: string, date: string, reason: string) => void
  clearDeadlineOverride: (deadlineId: string) => void
  updateRule: (ruleId: string, patch: Partial<DeadlineRule>) => void
  createDocument: (caseId: string, templateId: string, title: string) => string
  updateDocument: (id: string, patch: Partial<Pick<MatterDoc, 'title' | 'blocks' | 'status' | 'kind'>>) => void
  saveDocumentVersion: (id: string, note: string) => void
  restoreDocumentVersion: (id: string, versionId: string) => void
  createAuthority: (input: Omit<import('./types').Authority, 'id' | 'addedAt' | 'cites' | 'provenance'> & { provenance?: string }) => string
  saveAuthorityToCase: (caseId: string, authorityId: string, note: string) => void
  updateCaseAuthorityNote: (linkId: string, note: string) => void
  removeAuthorityFromCase: (linkId: string) => void
  createCitation: (caseId: string, authorityId: string, pinpoint: string) => string
  markCitation: (citationId: string, status: CitationStatus, source: CheckSource | undefined, note: string) => void
  addContact: (caseId: string | null, input: ContactInput, roles: ContactRole[], service: boolean) => string
  updateContact: (id: string, patch: Partial<Contact>) => void
  addContactToCase: (caseId: string, contactId: string, roles: ContactRole[], service: boolean) => string
  updateCaseContact: (linkId: string, patch: Partial<Pick<CaseContact, 'roles' | 'service' | 'active'>>) => void
  removeContactFromCase: (linkId: string) => void
  createNote: (caseId: string, title: string, body: string, links: NoteLink[]) => string
  updateNote: (id: string, patch: Partial<Pick<CaseNote, 'title' | 'body' | 'links'>>) => void
  addExhibit: (caseId: string, input: { number: number; title: string; description: string; pages: number }) => string
  updateExhibit: (id: string, patch: Partial<Exhibit>) => void
  readFileBytes: (fileId: string) => Promise<Uint8Array | null>
  saveAttachment: (name: string, mime: string, bytes: Uint8Array) => Promise<string>
  replaceExhibitFile: (
    exhibitId: string,
    bytes: Uint8Array,
    info: { fileName: string; pages: number; hasFormFields: boolean; bates?: Exhibit['bates'] },
  ) => Promise<void>
  createFiling: (input: FilingInput) => string
  updateFiling: (id: string, patch: Partial<Filing>) => void
  overridePreflight: (filingId: string, checkId: string, reason: string) => void
  stageFiling: (filingId: string) => Promise<StagingOutcome>
  recordFilingResult: (filingId: string, input: RecordResultInput) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  updateApprovedService: (id: string, patch: Partial<Settings['approvedServices'][number]>) => void
  moveToTrash: (type: TrashObjectType, objectId: string) => string
  restoreTrash: (trashId: string) => void
  purgeTrash: (trashId: string) => Promise<void>
  backupNow: (passphrase: string) => Promise<Blob>
  restoreFromBackupFile: (text: string, passphrase: string) => Promise<void>
  logOpen: (objectType: string, objectId: string, objectName: string) => void
  flushSave: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function auditEvent(data: AppData, spec: AuditSpec) {
  data.audit.unshift({
    id: uid('aud'),
    at: nowIso(),
    user: data.user,
    action: spec.action,
    objectType: spec.objectType,
    objectId: spec.objectId,
    objectName: spec.objectName,
    detail: spec.detail,
  })
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [data, setData] = useState<AppData | null>(null)
  const [bootError, setBootError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const keyRef = useRef<CryptoKey | null>(null)
  const metaRef = useRef<import('./types').VaultMeta | null>(null)
  const dataRef = useRef<AppData | null>(null)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const lastActivity = useRef(Date.now())
  const swept = useRef(false)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    vaultExists()
      .then(exists => setStatus(exists ? 'locked' : 'setup'))
      .catch(error => {
        setBootError(
          error instanceof Error
            ? error.message
            : 'The local vault could not be opened. Check that this browser allows local storage.',
        )
        setStatus('error')
      })
  }, [])

  const saveSnapshot = useCallback(() => {
    const key = keyRef.current
    const meta = metaRef.current
    const snapshot = dataRef.current
    if (!key || !meta || !snapshot) return
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        setSaveState('saving')
        const nextMeta = await persistVault(key, meta, snapshot)
        metaRef.current = nextMeta
        setSaveState('saved')
        setLastSavedAt(nextMeta.updatedAt)
      } catch (error) {
        setSaveState('error')
        setBootError(
          error instanceof Error ? error.message : 'The workspace could not be saved to this computer.',
        )
      }
    })
  }, [])

  useEffect(() => {
    if (!data || status !== 'unlocked') return
    setSaveState('saving')
    const timer = setTimeout(() => saveSnapshot(), 450)
    return () => clearTimeout(timer)
  }, [data, status, saveSnapshot])

  const flushSave = useCallback(async () => {
    saveSnapshot()
    await saveQueue.current
  }, [saveSnapshot])

  const setup = useCallback(async (passphrase: string, user: string, dataFolder: string) => {
    try {
      const session = await createVault(passphrase, user, dataFolder)
      keyRef.current = session.key
      metaRef.current = session.meta
      dataRef.current = session.data
      setData(session.data)
      setStatus('unlocked')
      setLastSavedAt(session.meta.updatedAt)
      setSaveState('saved')
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'The workspace could not be created.'
    }
  }, [])

  const unlock = useCallback(async (passphrase: string) => {
    const result = await unlockVault(passphrase)
    if (!result.ok) return result.error
    keyRef.current = result.key
    metaRef.current = result.meta
    const unlocked = result.data
    auditEvent(unlocked, {
      action: 'Unlock',
      objectType: 'Vault',
      objectName: 'Local workspace',
      detail: 'Workspace unlocked',
    })
    dataRef.current = unlocked
    setData(unlocked)
    setStatus('unlocked')
    setLastSavedAt(result.meta.updatedAt)
    setSaveState('saved')
    lastActivity.current = Date.now()
    return null
  }, [])

  const lock = useCallback(async () => {
    await flushSave()
    keyRef.current = null
    metaRef.current = null
    dataRef.current = null
    setData(null)
    setStatus('locked')
    swept.current = false
  }, [flushSave])

  const changePassphrase = useCallback(async (current: string, next: string) => {
    if (!keyRef.current || !metaRef.current || !dataRef.current) return 'The workspace is locked.'
    if (next.length < 8) return 'Use at least 8 characters for the new passphrase.'
    try {
      const rekeyed = await rekeyVault(current, next, keyRef.current, metaRef.current, dataRef.current)
      keyRef.current = rekeyed.key
      metaRef.current = rekeyed.meta
      setData(prev =>
        prev
          ? {
              ...prev,
              audit: [
                {
                  id: uid('aud'),
                  at: nowIso(),
                  user: prev.user,
                  action: 'Edit',
                  objectType: 'Vault',
                  objectName: 'Passphrase',
                  detail: 'Passphrase changed; files re-encrypted',
                },
                ...prev.audit,
              ],
            }
          : prev,
      )
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'The passphrase could not be changed.'
    }
  }, [])

  const update = useCallback((mutator: (draft: AppData) => void, audit?: AuditSpec | AuditSpec[]) => {
    setData(prev => {
      if (!prev) return prev
      const next = structuredClone(prev)
      mutator(next)
      if (audit) {
        const specs = Array.isArray(audit) ? audit : [audit]
        for (const spec of specs) auditEvent(next, spec)
      }
      return next
    })
  }, [])

  /* ---------------- Cases ---------------- */

  const createCase = useCallback(
    (input: NewCaseInput) => {
      const id = uid('case')
      const createdAt = nowIso()
      update(draft => {
        draft.cases.push({
          id,
          caption: input.caption.trim(),
          court: input.court.trim(),
          number: input.number.trim(),
          role: input.role,
          clientId: input.clientId.trim(),
          status: 'Active',
          triggerLabel: input.triggerLabel,
          triggerDate: input.triggerDate,
          judge: input.judge.trim(),
          createdAt,
          updatedAt: createdAt,
        })
        draft.deadlines.push(
          ...buildDeadlines(id, draft.rules, input.triggerLabel, input.triggerDate, draft.settings.courtHolidays).map(
            d => ({ ...d, createdAt }),
          ),
        )
        for (const party of input.parties) {
          if (!party.name.trim()) continue
          const contactId = uid('ctc')
          draft.contacts.push({
            id: contactId,
            name: party.name.trim(),
            organization: '',
            roleTitle: party.designation,
            address1: '',
            address2: '',
            city: '',
            state: '',
            zip: '',
            email: '',
            phone: '',
            source: 'Case',
            firmLevel: false,
            notes: '',
            createdAt,
          })
          draft.caseContacts.push({
            id: uid('link'),
            caseId: id,
            contactId,
            roles: ['Party'],
            service: false,
            active: true,
            addedAt: createdAt,
          })
        }
      }, {
        action: 'Create',
        objectType: 'Case',
        objectId: id,
        objectName: input.caption,
        detail: `${input.court} · No. ${input.number}`,
      })
      return id
    },
    [update],
  )

  const updateCase = useCallback(
    (id: string, patch: Partial<MatterCase>, detail?: string) => {
      update(
        draft => {
          const matter = draft.cases.find(c => c.id === id)
          if (!matter) return
          const previousTrigger = matter.triggerLabel
          Object.assign(matter, patch, { updatedAt: nowIso() })
          const triggerChanged =
            patch.triggerDate !== undefined || patch.triggerLabel !== undefined
          if (triggerChanged) {
            const labels = new Set([previousTrigger, matter.triggerLabel])
            for (const deadline of draft.deadlines) {
              if (deadline.caseId !== id || deadline.override) continue
              if (!labels.has(deadline.triggerLabel)) continue
              const rule = draft.rules.find(r => r.id === deadline.ruleId)
              if (!rule) continue
              deadline.triggerLabel = matter.triggerLabel
              deadline.triggerDate = matter.triggerDate
              deadline.computedDate = computeDeadlineDate(
                matter.triggerDate,
                rule,
                draft.settings.courtHolidays,
              )
            }
          }
        },
        {
          action: 'Edit',
          objectType: 'Case',
          objectId: id,
          objectName: patch.caption ?? '',
          detail,
        },
      )
    },
    [update],
  )

  const setCaseStatus = useCallback(
    (id: string, nextStatus: MatterCase['status']) => {
      update(
        draft => {
          const matter = draft.cases.find(c => c.id === id)
          if (!matter) return
          matter.status = nextStatus
          matter.updatedAt = nowIso()
        },
        { action: 'Edit', objectType: 'Case', objectId: id, detail: `Case ${nextStatus.toLowerCase()}` },
      )
    },
    [update],
  )

  const pinCase = useCallback(
    (id: string, pinned: boolean) => {
      update(draft => {
        const matter = draft.cases.find(c => c.id === id)
        if (matter) matter.pinned = pinned
      })
    },
    [update],
  )

  const addDeadlinesFromTrigger = useCallback(
    (caseId: string, triggerLabel: string, triggerDate: string) => {
      let added = 0
      update(
        draft => {
          const rules = rulesForTrigger(draft.rules, triggerLabel)
          const existing = new Set(
            draft.deadlines
              .filter(d => d.caseId === caseId && d.triggerLabel === triggerLabel)
              .map(d => d.ruleId),
          )
          for (const rule of rules) {
            if (existing.has(rule.id)) continue
            draft.deadlines.push({
              id: uid('ddl'),
              caseId,
              ruleId: rule.id,
              title: rule.name,
              triggerLabel,
              triggerDate,
              computedDate: computeDeadlineDate(triggerDate, rule, draft.settings.courtHolidays),
              createdAt: nowIso(),
            })
            added++
          }
        },
        {
          action: 'Create',
          objectType: 'Deadline',
          objectId: caseId,
          detail: `Added deadlines from ${triggerLabel}`,
        },
      )
      return added
    },
    [update],
  )

  const overrideDeadline = useCallback(
    (deadlineId: string, date: string, reason: string) => {
      let name = ''
      update(
        draft => {
          const deadline = draft.deadlines.find(d => d.id === deadlineId)
          if (!deadline) return
          if (!reason.trim()) return
          deadline.override = { date, reason: reason.trim(), at: nowIso(), user: draft.user }
          name = deadline.title
        },
        {
          action: 'Override deadline',
          objectType: 'Deadline',
          objectId: deadlineId,
          detail: `New date ${date}: ${reason}`,
        },
      )
      return name
    },
    [update],
  )

  const clearDeadlineOverride = useCallback(
    (deadlineId: string) => {
      update(
        draft => {
          const deadline = draft.deadlines.find(d => d.id === deadlineId)
          if (deadline) delete deadline.override
        },
        { action: 'Edit', objectType: 'Deadline', objectId: deadlineId, detail: 'Override removed' },
      )
    },
    [update],
  )

  const updateRule = useCallback(
    (ruleId: string, patch: Partial<DeadlineRule>) => {
      update(
        draft => {
          const rule = draft.rules.find(r => r.id === ruleId)
          if (!rule) return
          Object.assign(rule, patch)
          for (const deadline of draft.deadlines) {
            if (deadline.ruleId !== ruleId || deadline.override) continue
            deadline.computedDate = computeDeadlineDate(
              deadline.triggerDate,
              rule,
              draft.settings.courtHolidays,
            )
          }
        },
        { action: 'Edit', objectType: 'Deadline rule', objectId: ruleId, detail: 'Rule updated' },
      )
    },
    [update],
  )

  /* ---------------- Documents ---------------- */

  const createDocument = useCallback(
    (caseId: string, templateId: string, title: string) => {
      const id = uid('doc')
      update(
        draft => {
          draft.documents.push(makeDocument(id, caseId, templateId, title))
        },
        { action: 'Create', objectType: 'Document', objectId: id, objectName: title },
      )
      return id
    },
    [update],
  )

  const updateDocument = useCallback(
    (id: string, patch: Partial<Pick<MatterDoc, 'title' | 'blocks' | 'status' | 'kind'>>) => {
      update(draft => {
        const doc = draft.documents.find(d => d.id === id)
        if (!doc) return
        Object.assign(doc, patch, { updatedAt: nowIso() })
      })
    },
    [update],
  )

  const saveDocumentVersion = useCallback(
    (id: string, note: string) => {
      update(
        draft => {
          const doc = draft.documents.find(d => d.id === id)
          if (!doc) return
          const version: DocVersion = {
            id: uid('ver'),
            at: nowIso(),
            title: doc.title,
            body: structuredClone(doc.blocks),
            note: note.trim(),
          }
          doc.versions.unshift(version)
          doc.updatedAt = nowIso()
        },
        {
          action: 'Edit',
          objectType: 'Document',
          objectId: id,
          detail: note.trim() || 'Version saved',
        },
      )
    },
    [update],
  )

  const restoreDocumentVersion = useCallback(
    (id: string, versionId: string) => {
      update(
        draft => {
          const doc = draft.documents.find(d => d.id === id)
          const version = doc?.versions.find(v => v.id === versionId)
          if (!doc || !version) return
          doc.versions.unshift({
            id: uid('ver'),
            at: nowIso(),
            title: doc.title,
            body: structuredClone(doc.blocks),
            note: `Before restoring ${version.at}`,
          })
          doc.title = version.title
          doc.blocks = structuredClone(version.body)
          doc.updatedAt = nowIso()
        },
        { action: 'Edit', objectType: 'Document', objectId: id, detail: 'Version restored' },
      )
    },
    [update],
  )

  /* ---------------- Authorities & citations ---------------- */

  const createAuthority = useCallback(
    (input: Omit<import('./types').Authority, 'id' | 'addedAt' | 'cites' | 'provenance'> & { provenance?: string }) => {
      const id = uid('auth')
      update(
        draft => {
          draft.authorities.push({
            ...input,
            id,
            addedAt: nowIso(),
            cites: [],
            provenance: input.provenance || 'Added by the attorney',
          })
        },
        { action: 'Create', objectType: 'Authority', objectId: id, objectName: input.caseName },
      )
      return id
    },
    [update],
  )

  const saveAuthorityToCase = useCallback(
    (caseId: string, authorityId: string, note: string) => {
      update(
        draft => {
          if (
            draft.caseAuthorities.some(l => l.caseId === caseId && l.authorityId === authorityId)
          )
            return
          draft.caseAuthorities.push({
            id: uid('ca'),
            caseId,
            authorityId,
            note,
            savedAt: nowIso(),
          })
        },
        { action: 'Edit', objectType: 'Authority', objectId: authorityId, detail: 'Saved to case' },
      )
    },
    [update],
  )

  const updateCaseAuthorityNote = useCallback(
    (linkId: string, note: string) => {
      update(draft => {
        const link = draft.caseAuthorities.find(l => l.id === linkId)
        if (link) link.note = note
      })
    },
    [update],
  )

  const removeAuthorityFromCase = useCallback(
    (linkId: string) => {
      update(
        draft => {
          draft.caseAuthorities = draft.caseAuthorities.filter(l => l.id !== linkId)
        },
        { action: 'Edit', objectType: 'Authority', objectId: linkId, detail: 'Removed from case' },
      )
    },
    [update],
  )

  const createCitation = useCallback(
    (caseId: string, authorityId: string, pinpoint: string) => {
      const id = uid('cit')
      update(
        draft => {
          draft.citations.push({
            id,
            caseId,
            authorityId,
            pinpoint,
            status: 'Unverified',
            note: '',
            flagReason: '',
            createdAt: nowIso(),
          })
        },
        { action: 'Create', objectType: 'Citation', objectId: id, detail: 'Citation link created' },
      )
      return id
    },
    [update],
  )

  const markCitation = useCallback(
    (citationId: string, status: CitationStatus, source: CheckSource | undefined, note: string) => {
      update(
        draft => {
          const citation = draft.citations.find(c => c.id === citationId)
          if (!citation) return
          citation.status = status
          citation.checkedAt = status === 'Unverified' ? undefined : nowIso()
          citation.checkedSource = status === 'Unverified' ? undefined : source
          citation.note = note
          if (status === 'Flagged') citation.flagReason = note || 'Flagged by the attorney'
        },
        {
          action: 'Citation status',
          objectType: 'Citation',
          objectId: citationId,
          detail: `Marked ${status}${source ? ` · ${source}` : ''}${note ? ` · ${note}` : ''}`,
        },
      )
    },
    [update],
  )

  /* ---------------- People ---------------- */

  const contactFromInput = (input: ContactInput): Contact => ({
    id: uid('ctc'),
    name: input.name.trim(),
    organization: input.organization.trim(),
    roleTitle: input.roleTitle.trim(),
    address1: input.address1.trim(),
    address2: input.address2.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zip: input.zip.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    source: input.source,
    firmLevel: input.source !== 'Case',
    notes: input.notes.trim(),
    createdAt: nowIso(),
  })

  const addContact = useCallback(
    (caseId: string | null, input: ContactInput, roles: ContactRole[], service: boolean) => {
      const contact = contactFromInput(input)
      update(
        draft => {
          draft.contacts.push(contact)
          if (caseId) {
            draft.caseContacts.push({
              id: uid('link'),
              caseId,
              contactId: contact.id,
              roles,
              service,
              active: true,
              addedAt: nowIso(),
            })
          }
        },
        { action: 'Create', objectType: 'Contact', objectId: contact.id, objectName: contact.name },
      )
      return contact.id
    },
    [update],
  )

  const updateContact = useCallback(
    (id: string, patch: Partial<Contact>) => {
      update(
        draft => {
          const contact = draft.contacts.find(c => c.id === id)
          if (contact) Object.assign(contact, patch)
        },
        { action: 'Edit', objectType: 'Contact', objectId: id },
      )
    },
    [update],
  )

  const addContactToCase = useCallback(
    (caseId: string, contactId: string, roles: ContactRole[], service: boolean) => {
      const id = uid('link')
      update(
        draft => {
          const existing = draft.caseContacts.find(
            l => l.caseId === caseId && l.contactId === contactId && l.active,
          )
          if (existing) {
            existing.roles = Array.from(new Set([...existing.roles, ...roles]))
            existing.service = existing.service || service
            return
          }
          draft.caseContacts.push({
            id,
            caseId,
            contactId,
            roles,
            service,
            active: true,
            addedAt: nowIso(),
          })
        },
        { action: 'Edit', objectType: 'Contact', objectId: contactId, detail: 'Added to case' },
      )
      return id
    },
    [update],
  )

  const updateCaseContact = useCallback(
    (linkId: string, patch: Partial<Pick<CaseContact, 'roles' | 'service' | 'active'>>) => {
      update(draft => {
        const link = draft.caseContacts.find(l => l.id === linkId)
        if (link) Object.assign(link, patch)
      })
    },
    [update],
  )

  const removeContactFromCase = useCallback(
    (linkId: string) => {
      update(
        draft => {
          const link = draft.caseContacts.find(l => l.id === linkId)
          if (!link) return
          link.active = false
          link.removedAt = nowIso()
        },
        { action: 'Edit', objectType: 'Contact', objectId: linkId, detail: 'Removed from this case; master record kept' },
      )
    },
    [update],
  )

  /* ---------------- Notes ---------------- */

  const createNote = useCallback(
    (caseId: string, title: string, body: string, links: NoteLink[]) => {
      const id = uid('note')
      update(
        draft => {
          draft.notes.push({
            id,
            caseId,
            title: title.trim() || 'Untitled note',
            body,
            links,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          })
        },
        { action: 'Create', objectType: 'Note', objectId: id, objectName: title },
      )
      return id
    },
    [update],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<Pick<CaseNote, 'title' | 'body' | 'links'>>) => {
      update(draft => {
        const note = draft.notes.find(n => n.id === id)
        if (!note) return
        Object.assign(note, patch, { updatedAt: nowIso() })
      })
    },
    [update],
  )

  /* ---------------- Exhibits ---------------- */

  const addExhibit = useCallback(
    (caseId: string, input: { number: number; title: string; description: string; pages: number }) => {
      const id = uid('ex')
      update(
        draft => {
          draft.exhibits.push({
            id,
            caseId,
            number: input.number,
            title: input.title.trim() || `Exhibit ${input.number}`,
            description: input.description.trim(),
            pages: input.pages,
            hasText: false,
            hasFormFields: false,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          })
        },
        { action: 'Create', objectType: 'Exhibit', objectId: id, objectName: input.title },
      )
      return id
    },
    [update],
  )

  const updateExhibit = useCallback(
    (id: string, patch: Partial<Exhibit>) => {
      update(draft => {
        const exhibit = draft.exhibits.find(e => e.id === id)
        if (!exhibit) return
        Object.assign(exhibit, patch, { updatedAt: nowIso() })
      })
    },
    [update],
  )

  const readFileBytes = useCallback(async (fileId: string) => {
    if (!keyRef.current) return null
    const file = await loadFile(keyRef.current, fileId)
    return file?.bytes ?? null
  }, [])

  const saveAttachment = useCallback(async (name: string, mime: string, bytes: Uint8Array) => {
    if (!keyRef.current) throw new Error('The workspace is locked.')
    const meta = await saveFile(keyRef.current, name, mime, bytes)
    return meta.id
  }, [])

  const replaceExhibitFile = useCallback(
    async (
      exhibitId: string,
      bytes: Uint8Array,
      info: { fileName: string; pages: number; hasFormFields: boolean; bates?: Exhibit['bates'] },
    ) => {
      if (!keyRef.current) throw new Error('The workspace is locked.')
      const meta = await saveFile(keyRef.current, info.fileName, 'application/pdf', bytes)
      let previousFile: string | undefined
      update(draft => {
        const exhibit = draft.exhibits.find(e => e.id === exhibitId)
        if (!exhibit) return
        previousFile = exhibit.fileId
        exhibit.fileId = meta.id
        exhibit.fileName = meta.name
        exhibit.pages = info.pages
        exhibit.hasFormFields = info.hasFormFields
        exhibit.bates = info.bates
        exhibit.updatedAt = nowIso()
      })
      if (previousFile && previousFile !== meta.id) await removeFile(previousFile)
    },
    [update],
  )

  /* ---------------- Filings ---------------- */

  const createFiling = useCallback(
    (input: FilingInput) => {
      const id = uid('fil')
      update(
        draft => {
          draft.filings.push({
            id,
            caseId: input.caseId,
            documentId: input.documentId,
            type: input.type,
            serviceContactIds: input.serviceContactIds,
            exhibitIds: input.exhibitIds,
            filingCode: input.filingCode,
            fees: input.fees,
            paymentAccount: input.paymentAccount,
            filingAttorney: input.filingAttorney,
            additionalAttorneys: input.additionalAttorneys,
            underSeal: input.underSeal,
            limitedAppearance: input.limitedAppearance,
            status: 'Draft',
            envelopeNumber: '',
            rejectionReason: '',
            history: [],
            stagedFiles: [],
            preflightOverrides: [],
            createdAt: nowIso(),
            updatedAt: nowIso(),
          })
        },
        {
          action: 'Create',
          objectType: 'Filing',
          objectId: id,
          objectName: input.filingCode || 'Draft filing',
          detail: input.type,
        },
      )
      return id
    },
    [update],
  )

  const updateFiling = useCallback(
    (id: string, patch: Partial<Filing>) => {
      update(
        draft => {
          const filing = draft.filings.find(f => f.id === id)
          if (!filing) return
          if (['Submitted', 'Accepted', 'Rejected', 'Served'].includes(filing.status)) return
          Object.assign(filing, patch)
          if (filing.status === 'Staged' && patch.status === undefined) {
            filing.status = 'Draft'
            filing.stagedFiles = []
            filing.stagedAt = undefined
          }
          filing.updatedAt = nowIso()
        },
        { action: 'Edit', objectType: 'Filing', objectId: id },
      )
    },
    [update],
  )

  const overridePreflight = useCallback(
    (filingId: string, checkId: string, reason: string) => {
      update(
        draft => {
          const filing = draft.filings.find(f => f.id === filingId)
          if (!filing || !reason.trim()) return
          filing.preflightOverrides = filing.preflightOverrides.filter(o => o.checkId !== checkId)
          filing.preflightOverrides.push({
            checkId,
            reason: reason.trim(),
            at: nowIso(),
            user: draft.user,
          })
          filing.updatedAt = nowIso()
        },
        {
          action: 'Citation status',
          objectType: 'Filing',
          objectId: filingId,
          detail: `Preflight override (${checkId}): ${reason}`,
        },
      )
    },
    [update],
  )

  const stageFiling = useCallback(
    async (filingId: string): Promise<StagingOutcome> => {
      const snapshot = dataRef.current
      const key = keyRef.current
      if (!snapshot || !key) throw new Error('The workspace is locked.')
      const filing = snapshot.filings.find(f => f.id === filingId)
      if (!filing) throw new Error('That filing was not found.')
      const matter = snapshot.cases.find(c => c.id === filing.caseId)
      if (!matter) throw new Error('The case for this filing was not found.')
      const doc = snapshot.documents.find(d => d.id === filing.documentId)
      if (!doc) throw new Error('The draft for this filing was not found.')
      const { runPreflight } = await import('./preflight')
      const preflight = runPreflight(snapshot, filing, matter, doc)
      if (!preflight.ok) {
        const blockers = preflight.checks.filter(c => c.state === 'Failed')
        throw new Error(
          `Can't stage filing. ${blockers.map(c => c.label).join(' · ')} must be resolved or overridden.`,
        )
      }
      const exhibitBytes = new Map<string, Uint8Array>()
      for (const exhibitId of filing.exhibitIds) {
        const exhibit = snapshot.exhibits.find(e => e.id === exhibitId)
        if (!exhibit?.fileId) continue
        const file = await loadFile(key, exhibit.fileId)
        if (file) exhibitBytes.set(exhibitId, file.bytes)
      }
      const packet = await buildPacket(snapshot, matter, filing, doc, exhibitBytes)
      const zipName = `${matter.number || 'filing'}-${doc.title.replace(/[\\/:*?"<>|]+/g, '-')}-packet.zip`
      const zipMeta = await saveFile(key, zipName, 'application/zip', packet.zip)
      const flattenedFiles = new Map<string, string>()
      for (const flattened of packet.flattenedExhibits) {
        const exhibit = snapshot.exhibits.find(e => e.id === flattened.exhibitId)
        const meta = await saveFile(
          key,
          exhibit?.fileName || `exhibit-${flattened.exhibitId}.pdf`,
          'application/pdf',
          flattened.bytes,
        )
        flattenedFiles.set(flattened.exhibitId, meta.id)
      }
      const stagedFiles: StagedFile[] = [
        ...packet.files,
        { name: zipName, kind: 'Packet', fileId: zipMeta.id, note: 'Packet ZIP' },
      ]
      update(
        draft => {
          const target = draft.filings.find(f => f.id === filingId)
          if (!target) return
          target.status = 'Staged'
          target.stagedFiles = stagedFiles
          target.stagedAt = nowIso()
          target.updatedAt = nowIso()
          for (const [exhibitId, fileId] of flattenedFiles) {
            const exhibit = draft.exhibits.find(e => e.id === exhibitId)
            if (!exhibit) continue
            exhibit.fileId = fileId
            exhibit.hasFormFields = false
            exhibit.updatedAt = nowIso()
          }
        },
        {
          action: 'Stage filing',
          objectType: 'Filing',
          objectId: filingId,
          detail: `Packet staged with ${packet.files.length} files`,
        },
      )
      return { packet, zipFileId: zipMeta.id, zipName }
    },
    [update],
  )

  const recordFilingResult = useCallback(
    async (filingId: string, input: RecordResultInput) => {
      const snapshot = dataRef.current
      const key = keyRef.current
      if (!snapshot || !key) throw new Error('The workspace is locked.')
      const filing = snapshot.filings.find(f => f.id === filingId)
      if (!filing) throw new Error('That filing was not found.')
      if (!input.envelopeNumber.trim()) throw new Error('Enter the envelope number from eFile & Serve.')
      let proofFileId: string | undefined
      let proofFileName: string | undefined
      if (input.proof) {
        const meta = await saveFile(key, input.proof.name, 'application/pdf', input.proof.bytes)
        proofFileId = meta.id
        proofFileName = meta.name
      }
      update(
        draft => {
          const target = draft.filings.find(f => f.id === filingId)
          if (!target) return
          target.status = input.status
          target.envelopeNumber = input.envelopeNumber.trim()
          target.rejectionReason = input.rejectionReason.trim()
          if (proofFileId) {
            target.proofFileId = proofFileId
            target.proofFileName = proofFileName
          }
          if (!target.submittedAt) target.submittedAt = nowIso()
          target.resolvedAt = nowIso()
          target.history.push({
            at: nowIso(),
            status: input.status,
            note: input.rejectionReason.trim() || (input.status === 'Submitted' ? 'Submitted in eFile & Serve' : input.status),
            user: draft.user,
          })
          target.updatedAt = nowIso()
        },
        {
          action: 'Filing result',
          objectType: 'Filing',
          objectId: filingId,
          detail: `${input.status} · Envelope ${input.envelopeNumber}${
            input.rejectionReason ? ` · ${input.rejectionReason}` : ''
          }`,
        },
      )
    },
    [update],
  )

  /* ---------------- Settings & services ---------------- */

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      update(
        draft => {
          Object.assign(draft.settings, patch)
          if (patch.retentionDays !== undefined) {
            draft.settings.retentionDays = Math.max(
              RETENTION_MIN,
              Math.min(RETENTION_MAX, patch.retentionDays),
            )
          }
        },
        { action: 'Edit', objectType: 'Settings', detail: Object.keys(patch).join(', ') },
      )
    },
    [update],
  )

  const updateApprovedService = useCallback(
    (id: string, patch: Partial<Settings['approvedServices'][number]>) => {
      update(
        draft => {
          const service = draft.settings.approvedServices.find(s => s.id === id)
          if (!service) return
          Object.assign(service, patch)
          if (patch.approved) service.approvedAt = nowIso()
          if (patch.approved === false) service.approvedAt = undefined
        },
        { action: 'Edit', objectType: 'Approved service', objectId: id },
      )
    },
    [update],
  )

  /* ---------------- Deletion service ---------------- */

  const moveToTrash = useCallback(
    (type: TrashObjectType, objectId: string) => {
      const trashId = uid('trash')
      update(
        draft => {
          const caseFor = (caseId?: string) => draft.cases.find(c => c.id === caseId)
          let snapshot: unknown = null
          let name = ''
          let caseId: string | undefined
          let references: TrashItem['references'] = []

          if (type === 'Case') {
            const matter = draft.cases.find(c => c.id === objectId)
            if (!matter) return
            matter.deletedAt = nowIso()
            snapshot = structuredClone(matter)
            name = matter.caption
            caseId = matter.id
          } else if (type === 'Document') {
            const doc = draft.documents.find(d => d.id === objectId)
            if (!doc) return
            snapshot = structuredClone(doc)
            name = doc.title
            caseId = doc.caseId
            draft.documents = draft.documents.filter(d => d.id !== objectId)
          } else if (type === 'Exhibit') {
            const exhibit = draft.exhibits.find(e => e.id === objectId)
            if (!exhibit) return
            snapshot = structuredClone(exhibit)
            name = `Exhibit ${exhibit.number}: ${exhibit.title}`
            caseId = exhibit.caseId
            for (const doc of draft.documents) {
              if (doc.deletedAt) continue
              if (doc.blocks.some(b => b.text.includes(`{{ex:${objectId}`))) {
                references.push({ docId: doc.id, docTitle: doc.title })
              }
            }
            draft.exhibits = draft.exhibits.filter(e => e.id !== objectId)
          } else if (type === 'Note') {
            const note = draft.notes.find(n => n.id === objectId)
            if (!note) return
            snapshot = structuredClone(note)
            name = note.title
            caseId = note.caseId
            draft.notes = draft.notes.filter(n => n.id !== objectId)
          } else if (type === 'Filing') {
            const filing = draft.filings.find(f => f.id === objectId)
            if (!filing || filing.status !== 'Draft') return
            snapshot = structuredClone(filing)
            name = filing.filingCode || 'Filing draft'
            caseId = filing.caseId
            draft.filings = draft.filings.filter(f => f.id !== objectId)
          } else if (type === 'Authority') {
            const auth = draft.authorities.find(a => a.id === objectId)
            if (!auth) return
            snapshot = structuredClone(auth)
            name = auth.caseName
            draft.authorities = draft.authorities.filter(a => a.id !== objectId)
            draft.caseAuthorities = draft.caseAuthorities.filter(l => l.authorityId !== objectId)
            for (const citation of draft.citations) {
              if (citation.authorityId === objectId && citation.status === 'Verified') {
                citation.status = 'Unverified'
                citation.checkedAt = undefined
                citation.checkedSource = undefined
                citation.note = 'Authority record removed; verification cleared'
              }
            }
            for (const doc of draft.documents) {
              if (doc.blocks.some(b => b.text.includes('{{cite:'))) {
                const uses = docCitationUses(draft, doc).filter(use => {
                  const citation = draft.citations.find(c => c.id === use.citationId)
                  return citation?.authorityId === objectId
                })
                if (uses.length) references.push({ docId: doc.id, docTitle: doc.title })
              }
            }
          } else if (type === 'Deadline') {
            const deadline = draft.deadlines.find(d => d.id === objectId)
            if (!deadline) return
            snapshot = structuredClone(deadline)
            name = deadline.title
            caseId = deadline.caseId
            draft.deadlines = draft.deadlines.filter(d => d.id !== objectId)
          } else if (type === 'Contact') {
            const contact = draft.contacts.find(c => c.id === objectId)
            if (!contact) return
            const links = draft.caseContacts.filter(l => l.contactId === objectId)
            snapshot = {
              contact: structuredClone(contact),
              links: structuredClone(links.filter(l => l.active).map(l => l.id)),
            }
            name = contact.name
            caseId = links[0]?.caseId
            for (const link of links) {
              link.active = false
              link.removedAt = nowIso()
            }
            draft.contacts = draft.contacts.filter(c => c.id !== objectId)
          }

          const matter = caseFor(caseId)
          draft.trash.unshift({
            id: trashId,
            objectType: type,
            objectId,
            name,
            caseId,
            caseCaption: matter?.caption,
            deletedAt: nowIso(),
            snapshot,
            references,
          })
        },
        {
          action: 'Delete',
          objectType: type,
          objectId,
          detail: 'Moved to Recently Deleted',
        },
      )
      return trashId
    },
    [update],
  )

  const restoreTrash = useCallback(
    (trashId: string) => {
      update(
        draft => {
          const item = draft.trash.find(t => t.id === trashId)
          if (!item) return
          if (item.objectType === 'Case') {
            const matter = draft.cases.find(c => c.id === item.objectId)
            if (matter) delete matter.deletedAt
          } else if (item.objectType === 'Document') {
            draft.documents.push(item.snapshot as MatterDoc)
          } else if (item.objectType === 'Exhibit') {
            draft.exhibits.push(item.snapshot as Exhibit)
          } else if (item.objectType === 'Note') {
            draft.notes.push(item.snapshot as CaseNote)
          } else if (item.objectType === 'Filing') {
            draft.filings.push(item.snapshot as Filing)
          } else if (item.objectType === 'Authority') {
            draft.authorities.push(item.snapshot as import('./types').Authority)
          } else if (item.objectType === 'Deadline') {
            draft.deadlines.push(item.snapshot as Deadline)
          } else if (item.objectType === 'Contact') {
            const snap = item.snapshot as { contact: Contact; links: string[] }
            if (!draft.contacts.some(c => c.id === snap.contact.id)) draft.contacts.push(snap.contact)
            for (const link of draft.caseContacts) {
              if (snap.links.includes(link.id)) {
                link.active = true
                delete link.removedAt
              }
            }
          }
          draft.trash = draft.trash.filter(t => t.id !== trashId)
        },
        {
          action: 'Restore',
          objectType: 'Recently Deleted',
          objectId: trashId,
        },
      )
    },
    [update],
  )

  const purgeTrash = useCallback(
    async (trashId: string) => {
      const snapshot = dataRef.current
      if (!snapshot) return
      const item = snapshot.trash.find(t => t.id === trashId)
      if (!item) return
      const filesToRemove: string[] = []
      if (item.objectType === 'Exhibit') {
        const exhibit = item.snapshot as Exhibit
        if (exhibit.fileId) filesToRemove.push(exhibit.fileId)
      }
      if (item.objectType === 'Filing') {
        const filing = item.snapshot as Filing
        if (filing.proofFileId) filesToRemove.push(filing.proofFileId)
      }
      let caseFiles: string[] = []
      if (item.objectType === 'Case') {
        caseFiles = snapshot.exhibits
          .filter(e => e.caseId === item.objectId)
          .map(e => e.fileId)
          .filter((x): x is string => Boolean(x))
        for (const filing of snapshot.filings) {
          if (filing.caseId === item.objectId && filing.proofFileId)
            caseFiles.push(filing.proofFileId)
        }
      }
      update(
        draft => {
          if (item.objectType === 'Case') {
            const caseId = item.objectId
            draft.cases = draft.cases.filter(c => c.id !== caseId)
            draft.deadlines = draft.deadlines.filter(d => d.caseId !== caseId)
            draft.documents = draft.documents.filter(d => d.caseId !== caseId)
            draft.exhibits = draft.exhibits.filter(e => e.caseId !== caseId)
            draft.filings = draft.filings.filter(f => f.caseId !== caseId)
            draft.notes = draft.notes.filter(n => n.caseId !== caseId)
            draft.caseContacts = draft.caseContacts.filter(l => l.caseId !== caseId)
            draft.caseAuthorities = draft.caseAuthorities.filter(l => l.caseId !== caseId)
            draft.citations = draft.citations.filter(c => c.caseId !== caseId)
            draft.trash = draft.trash.filter(t => t.caseId !== caseId)
          }
          draft.trash = draft.trash.filter(t => t.id !== trashId)
        },
        {
          action: 'Permanent delete',
          objectType: item.objectType,
          objectId: item.objectId,
          objectName: item.name,
          detail: 'Permanently deleted. Earlier backups may still contain this item.',
        },
      )
      for (const fileId of [...filesToRemove, ...caseFiles]) {
        try {
          await removeFile(fileId)
        } catch {
          // The file may already have been removed; the record is gone either way.
        }
      }
    },
    [update],
  )

  /* ---------------- Backup ---------------- */

  const backupNow = useCallback(
    async (passphrase: string) => {
      if (!keyRef.current || !dataRef.current) throw new Error('The workspace is locked.')
      const blob = await createBackup(keyRef.current, dataRef.current, passphrase)
      update(
        draft => {
          draft.settings.backups.lastBackupAt = nowIso()
        },
        { action: 'Backup', objectType: 'Vault', detail: 'Encrypted backup created' },
      )
      return blob
    },
    [update],
  )

  const restoreFromBackupFile = useCallback(async (text: string, passphrase: string) => {
    const session = await restoreBackup(passphrase, text)
    auditEvent(session.data, {
      action: 'Restore',
      objectType: 'Vault',
      objectName: 'Backup restored',
      detail: 'Workspace restored from an encrypted backup',
    })
    keyRef.current = session.key
    metaRef.current = session.meta
    dataRef.current = session.data
    setData(session.data)
    setStatus('unlocked')
    setSaveState('saved')
    setLastSavedAt(session.meta.updatedAt)
    await persistVault(session.key, session.meta, session.data)
  }, [])

  const logOpen = useCallback(
    (objectType: string, objectId: string, objectName: string) => {
      update(draft => {
        auditEvent(draft, { action: 'Open', objectType, objectId, objectName })
      })
    },
    [update],
  )

  /* ---------------- Housekeeping ---------------- */

  const sweep = useCallback(async () => {
    const snapshot = dataRef.current
    if (!snapshot) return
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - snapshot.settings.retentionDays)
    const expired = snapshot.trash.filter(
      item => item.objectType !== 'Case' && new Date(item.deletedAt) < cutoff,
    )
    for (const item of expired) {
      await purgeTrash(item.id)
    }
  }, [purgeTrash])

  useEffect(() => {
    if (status !== 'unlocked' || swept.current) return
    swept.current = true
    void sweep()
  }, [status, sweep])

  // Inactivity auto-lock.
  const autoLockMinutes = data?.settings.autoLockMinutes
  useEffect(() => {
    if (status !== 'unlocked' || !autoLockMinutes) return
    const minutes = Math.max(1, autoLockMinutes)
    const bump = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    window.addEventListener('wheel', bump, { passive: true })
    window.addEventListener('touchstart', bump, { passive: true })
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= minutes * 60_000) {
        void lock()
      }
    }, 10_000)
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('wheel', bump)
      window.removeEventListener('touchstart', bump)
      window.clearInterval(timer)
    }
  }, [status, autoLockMinutes, lock])

  const value = useMemo<StoreValue>(
    () => ({
      status,
      data,
      bootError,
      saveState,
      lastSavedAt,
      setup,
      unlock,
      lock,
      changePassphrase,
      update,
      createCase,
      updateCase,
      setCaseStatus,
      pinCase,
      addDeadlinesFromTrigger,
      overrideDeadline,
      clearDeadlineOverride,
      updateRule,
      createDocument,
      updateDocument,
      saveDocumentVersion,
      restoreDocumentVersion,
      createAuthority,
      saveAuthorityToCase,
      updateCaseAuthorityNote,
      removeAuthorityFromCase,
      createCitation,
      markCitation,
      addContact,
      updateContact,
      addContactToCase,
      updateCaseContact,
      removeContactFromCase,
      createNote,
      updateNote,
      addExhibit,
      updateExhibit,
      readFileBytes,
      saveAttachment,
      replaceExhibitFile,
      createFiling,
      updateFiling,
      overridePreflight,
      stageFiling,
      recordFilingResult,
      updateSettings,
      updateApprovedService,
      moveToTrash,
      restoreTrash,
      purgeTrash,
      backupNow,
      restoreFromBackupFile,
      logOpen,
      flushSave,
    }),
    [
      status,
      data,
      bootError,
      saveState,
      lastSavedAt,
      setup,
      unlock,
      lock,
      changePassphrase,
      update,
      createCase,
      updateCase,
      setCaseStatus,
      pinCase,
      addDeadlinesFromTrigger,
      overrideDeadline,
      clearDeadlineOverride,
      updateRule,
      createDocument,
      updateDocument,
      saveDocumentVersion,
      restoreDocumentVersion,
      createAuthority,
      saveAuthorityToCase,
      updateCaseAuthorityNote,
      removeAuthorityFromCase,
      createCitation,
      markCitation,
      addContact,
      updateContact,
      addContactToCase,
      updateCaseContact,
      removeContactFromCase,
      createNote,
      updateNote,
      addExhibit,
      updateExhibit,
      readFileBytes,
      saveAttachment,
      replaceExhibitFile,
      createFiling,
      updateFiling,
      overridePreflight,
      stageFiling,
      recordFilingResult,
      updateSettings,
      updateApprovedService,
      moveToTrash,
      restoreTrash,
      purgeTrash,
      backupNow,
      restoreFromBackupFile,
      logOpen,
      flushSave,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider.')
  return store
}

export function useWorkspace(): StoreValue & { data: AppData } {
  const store = useStore()
  if (!store.data) throw new Error('The workspace is locked.')
  return store as StoreValue & { data: AppData }
}

/* ------------------------------------------------------------------ */
/* Helper used by case creation                                        */
/* ------------------------------------------------------------------ */

function makeDocument(id: string, caseId: string, templateId: string, title: string): MatterDoc {
  const at = nowIso()
  return {
    id,
    caseId,
    title: title.trim() || 'Untitled document',
    kind: templateId.includes('brief')
      ? 'Appellate Brief'
      : templateId.includes('motion')
        ? 'Motion'
        : templateId.includes('soq')
          ? 'Statement of Questions'
          : templateId.includes('toc')
            ? 'Table of Contents'
            : templateId.includes('toa')
              ? 'Table of Authorities'
              : templateId.includes('tos')
                ? 'Certificate of Service'
                : 'Other',
    templateId,
    blocks: templateBlocks(templateId, title),
    versions: [],
    status: 'Draft',
    createdAt: at,
    updatedAt: at,
  }
}
