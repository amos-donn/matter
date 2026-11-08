/** Domain model for Legal Matter Workspace. */

export type ID = string
export type ISODate = string // YYYY-MM-DD
export type Timestamp = string // ISO 8601 datetime

export type CaseStatus = 'Active' | 'Archived'

export interface MatterCase {
  id: ID
  caption: string
  court: string
  number: string
  role: string
  clientId: string
  status: CaseStatus
  triggerLabel: string
  triggerDate: ISODate
  judge: string
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt?: Timestamp
  pinned?: boolean
}

export type DeadlineStatus = 'Upcoming' | 'Due Soon' | 'Overdue' | 'Overridden'

export interface DeadlineRule {
  id: ID
  name: string
  trigger: string
  days: number
  /** Weekends roll forward to the next business day when the court is closed. */
  rollWeekend: boolean
  ruleRef: string
  note: string
  builtIn: boolean
}

export interface Deadline {
  id: ID
  caseId: ID
  ruleId: ID
  title: string
  triggerLabel: string
  triggerDate: ISODate
  computedDate: ISODate
  createdAt: Timestamp
  override?: {
    date: ISODate
    reason: string
    at: Timestamp
    user: string
  }
}

export type ContactRole = 'Party' | 'Counsel'
export type ContactSource = 'Case' | 'Firm' | 'Public'

export interface Contact {
  id: ID
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
  source: ContactSource
  firmLevel: boolean
  notes: string
  createdAt: Timestamp
}

export interface CaseContact {
  id: ID
  caseId: ID
  contactId: ID
  roles: ContactRole[]
  service: boolean
  active: boolean
  addedAt: Timestamp
  removedAt?: Timestamp
}

export interface NoteLink {
  type: 'Document' | 'Authority' | 'Exhibit'
  id: ID
  label: string
}

export interface CaseNote {
  id: ID
  caseId: ID
  title: string
  body: string
  links: NoteLink[]
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt?: Timestamp
}

export type AuthoritySource = 'Vermont' | 'CourtListener' | 'Manual'

export interface Authority {
  id: ID
  caseName: string
  court: string
  reporter: string
  year: number
  source: AuthoritySource
  summary: string
  /** Saved opinion text, when the attorney has added it. */
  text: string
  url: string
  /** Other authority ids in the local index that cite this one (lookup aid only). */
  cites: ID[]
  addedAt: Timestamp
  provenance: string
}

export interface CaseAuthority {
  id: ID
  caseId: ID
  authorityId: ID
  note: string
  savedAt: Timestamp
}

export type CitationStatus = 'Verified' | 'Unverified' | 'Flagged'
export type CheckSource = 'Westlaw KeyCite' | 'Reading the opinion' | 'Other'

export interface Citation {
  id: ID
  caseId: ID
  authorityId: ID
  pinpoint: string
  status: CitationStatus
  checkedAt?: Timestamp
  checkedSource?: CheckSource
  note: string
  flagReason: string
  createdAt: Timestamp
}

export type BlockType =
  | 'caption'
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'pagebreak'
  | 'tableOfContents'
  | 'tableOfAuthorities'
  | 'exhibitIndex'
  | 'certificateOfService'

export interface DocBlock {
  id: ID
  type: BlockType
  text: string
  level?: 1 | 2 | 3
  font?: string
  size?: number
}

export type DocKind =
  | 'Appellate Brief'
  | 'Motion'
  | 'Statement of Questions'
  | 'Table of Contents'
  | 'Table of Authorities'
  | 'Certificate of Service'
  | 'Other'

export interface DocVersion {
  id: ID
  at: Timestamp
  title: string
  body: DocBlock[]
  note: string
}

export interface MatterDoc {
  id: ID
  caseId: ID
  title: string
  kind: DocKind
  templateId: string
  blocks: DocBlock[]
  versions: DocVersion[]
  status: 'Draft' | 'Final'
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt?: Timestamp
}

export type BatesPlacement = 'Bottom right' | 'Bottom center' | 'Top right'

export interface BatesSettings {
  prefix: string
  start: number
  end: number
  placement: BatesPlacement
  appliedAt: Timestamp
}

export interface Exhibit {
  id: ID
  caseId: ID
  number: number
  title: string
  description: string
  fileId?: ID
  fileName?: string
  pages: number
  bates?: BatesSettings
  hasText: boolean
  hasFormFields: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  deletedAt?: Timestamp
}

export type FilingType = 'eFile Only' | 'eFile and Serve' | 'Serve Only'
export type FilingStatus = 'Draft' | 'Staged' | 'Submitted' | 'Accepted' | 'Rejected' | 'Served'

export interface StagedFile {
  name: string
  kind: 'Document' | 'Exhibit' | 'Certificate' | 'Index' | 'Checklist' | 'Packet'
  fileId?: ID
  note?: string
}

export interface PreflightOverride {
  checkId: string
  reason: string
  at: Timestamp
  user: string
}

export interface FilingHistoryEntry {
  at: Timestamp
  status: FilingStatus
  note: string
  user: string
}

export interface Filing {
  id: ID
  caseId: ID
  documentId: ID
  type: FilingType
  serviceContactIds: ID[]
  exhibitIds: ID[]
  filingCode: string
  fees: string
  paymentAccount: string
  filingAttorney: string
  additionalAttorneys: string
  underSeal: boolean
  limitedAppearance: boolean
  status: FilingStatus
  envelopeNumber: string
  rejectionReason: string
  proofFileId?: ID
  proofFileName?: string
  history: FilingHistoryEntry[]
  stagedFiles: StagedFile[]
  stagedAt?: Timestamp
  preflightOverrides: PreflightOverride[]
  submittedAt?: Timestamp
  resolvedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TrashObjectType =
  | 'Case'
  | 'Document'
  | 'Exhibit'
  | 'Note'
  | 'Filing'
  | 'Authority'
  | 'Deadline'
  | 'Contact'

export interface TrashItem {
  id: ID
  objectType: TrashObjectType
  objectId: ID
  name: string
  caseId?: ID
  caseCaption?: string
  deletedAt: Timestamp
  snapshot: unknown
  /** Ids of references that will re-link when restored. */
  references: { docId: ID; docTitle: string }[]
}

export type AuditAction =
  | 'Open'
  | 'Create'
  | 'Edit'
  | 'Export'
  | 'Stage filing'
  | 'Filing result'
  | 'Delete'
  | 'Restore'
  | 'Permanent delete'
  | 'Override deadline'
  | 'Citation status'
  | 'Backup'
  | 'Unlock'
  | 'Lock'

export interface AuditEvent {
  id: ID
  at: Timestamp
  user: string
  action: AuditAction
  objectType: string
  objectId?: ID
  objectName?: string
  detail?: string
}

export interface ApprovedService {
  id: ID
  name: string
  purpose: string
  dataTerms: string
  approved: boolean
  approvedAt?: Timestamp
  endpoint: string
  token: string
}

export interface BackupSettings {
  location: string
  schedule: 'Off' | 'Daily' | 'Weekly'
  lastBackupAt?: Timestamp
}

export interface Settings {
  retentionDays: number
  autoLockMinutes: number
  interfaceScale: 'Default' | 'Large'
  animations: 'System' | 'On' | 'Off'
  dataFolder: string
  backups: BackupSettings
  approvedServices: ApprovedService[]
  efileUrl: string
  filingCodes: string[]
  paymentAccounts: string[]
  filingAttorneys: string[]
  courtHolidays: string[]
  showCitationMarks: boolean
  defaultFilingFees: string
}

export interface AppData {
  schemaVersion: number
  initializedAt: Timestamp
  user: string
  settings: Settings
  cases: MatterCase[]
  deadlines: Deadline[]
  rules: DeadlineRule[]
  contacts: Contact[]
  caseContacts: CaseContact[]
  notes: CaseNote[]
  authorities: Authority[]
  caseAuthorities: CaseAuthority[]
  citations: Citation[]
  documents: MatterDoc[]
  exhibits: Exhibit[]
  filings: Filing[]
  audit: AuditEvent[]
  trash: TrashItem[]
}

export interface StoredFileMeta {
  id: ID
  name: string
  mime: string
  size: number
  createdAt: Timestamp
}

export interface VaultMeta {
  version: 1
  salt: string
  iterations: number
  verifier: { iv: string; data: string }
  updatedAt: Timestamp
}

export type RouteSection =
  | 'overview'
  | 'documents'
  | 'research'
  | 'exhibits'
  | 'filings'
  | 'deadlines'
  | 'people'
  | 'notes'

export interface Route {
  view:
    | 'today'
    | 'cases'
    | 'case'
    | 'calendar'
    | 'queue'
    | 'library'
    | 'trash'
    | 'settings'
    | 'audit'
  caseId?: ID
  section?: RouteSection
  docId?: ID
}
