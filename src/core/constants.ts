import type { CheckSource, FilingType, Settings } from './types'

export const APP_NAME = 'Legal Matter Workspace'
export const APP_VERSION = '1.0.0'
export const SCHEMA_VERSION = 1
export const JURISDICTION = 'Vermont'

export const CASE_ROLES = [
  'Appellant',
  'Appellee',
  'Petitioner',
  'Respondent',
  'Cross-Appellant',
  'Cross-Appellee',
  'Applicant',
  'Other',
]

export const COURTS = [
  'Vermont Supreme Court',
  'Vermont Superior Court',
  'United States Court of Appeals for the Second Circuit',
  'United States District Court for the District of Vermont',
]

export const COUNTERPART_ROLE: Record<string, string> = {
  Appellant: 'Appellee',
  Appellee: 'Appellant',
  Petitioner: 'Respondent',
  Respondent: 'Petitioner',
  'Cross-Appellant': 'Cross-Appellee',
  'Cross-Appellee': 'Cross-Appellant',
}

export const FILING_TYPES: FilingType[] = ['eFile Only', 'eFile and Serve', 'Serve Only']

export const CHECK_SOURCES: CheckSource[] = ['Westlaw KeyCite', 'Reading the opinion', 'Other']

export const FILING_CODE_SUGGESTIONS = [
  'Appellant Brief',
  'Appellee Brief',
  'Reply Brief',
  'Motion',
  'Statement of Questions',
  'Notice of Appeal',
  'Docketing Statement',
  'Other',
]

export const DEFAULT_EFILE_URL = 'https://efile.vermontjudiciary.org/'

export const RULE_CONFIRMATION_NOTE =
  'Seed rule shipped with the app. Confirm the period and the rule reference against the current Vermont Rules of Appellate Procedure before relying on it. Edit the rule here if it differs.'

export const DEFAULT_SETTINGS: Settings = {
  retentionDays: 30,
  autoLockMinutes: 15,
  interfaceScale: 'Default',
  animations: 'System',
  dataFolder: 'Documents\\Legal Matter Workspace',
  backups: { location: '', schedule: 'Off' },
  approvedServices: [
    {
      id: 'svc_courtlistener',
      name: 'CourtListener (Free Law Project)',
      purpose: 'Search and retrieval of federal and state appellate opinions.',
      dataTerms:
        'Sends only the search query typed by the attorney. Review CourtListener terms of use before approving. No client content is sent.',
      approved: false,
      endpoint: 'https://www.courtlistener.com/api/rest/v4/search/',
      token: '',
    },
    {
      id: 'svc_vermont',
      name: 'Vermont Judiciary opinions',
      purpose: 'Vermont Supreme Court opinion search and citation lookup.',
      dataTerms:
        'Terms, format, and access for indexing published Vermont opinions are unconfirmed (OQ-5). Approved services only.',
      approved: false,
      endpoint: '',
      token: '',
    },
    {
      id: 'svc_ai',
      name: 'AI model API',
      purpose: 'Drafting assistance and summaries.',
      dataTerms:
        'Deferred until data terms are approved (OQ-3). Off by default. Sends only text the attorney selects.',
      approved: false,
      endpoint: '',
      token: '',
    },
  ],
  efileUrl: DEFAULT_EFILE_URL,
  filingCodes: FILING_CODE_SUGGESTIONS,
  paymentAccounts: [],
  filingAttorneys: [],
  courtHolidays: [],
  showCitationMarks: true,
  defaultFilingFees: '',
}

export const RETENTION_MIN = 7
export const RETENTION_MAX = 90
