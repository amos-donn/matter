import type {
  AppData,
  Authority,
  DeadlineRule,
  DocBlock,
  DocKind,
  Settings,
} from './types'
import { DEFAULT_SETTINGS, RULE_CONFIRMATION_NOTE, SCHEMA_VERSION } from './constants'
import { nowIso, uid } from './util'

/* ------------------------------------------------------------------ */
/* Deadline rules                                                      */
/* ------------------------------------------------------------------ */

export const SEED_RULES: DeadlineRule[] = [
  {
    id: 'rule_noa',
    name: 'Notice of appeal',
    trigger: 'Judgment entered',
    days: 30,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 4(a)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
  {
    id: 'rule_docketing',
    name: 'Docketing statement and statement of questions',
    trigger: 'Notice of appeal filed',
    days: 14,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 10(b)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
  {
    id: 'rule_appellant_brief',
    name: "Appellant's brief",
    trigger: 'Record transmitted',
    days: 35,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 31(a)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
  {
    id: 'rule_appellee_brief',
    name: "Appellee's brief",
    trigger: "Appellant's brief served",
    days: 35,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 31(b)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
  {
    id: 'rule_reply_brief',
    name: 'Reply brief',
    trigger: "Appellee's brief served",
    days: 14,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 31(c)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
  {
    id: 'rule_motion_response',
    name: 'Response to motion',
    trigger: 'Motion served',
    days: 10,
    rollWeekend: true,
    ruleRef: 'V.R.A.P. 27(a)',
    note: RULE_CONFIRMATION_NOTE,
    builtIn: true,
  },
]

export const TRIGGER_EVENTS = Array.from(new Set(SEED_RULES.map(r => r.trigger)))

/* ------------------------------------------------------------------ */
/* Document templates                                                   */
/* ------------------------------------------------------------------ */

type TemplateBlock = Omit<DocBlock, 'id'>

export interface DocTemplateDef {
  id: string
  name: string
  kind: DocKind
  description: string
  blocks: TemplateBlock[]
}

const p = (text: string): TemplateBlock => ({ type: 'paragraph', text })
const h = (text: string, level: 1 | 2 | 3 = 1): TemplateBlock => ({ type: 'heading', text, level })
const caption: TemplateBlock = { type: 'caption', text: '' }
const certificate: TemplateBlock = { type: 'certificateOfService', text: '' }

export const DOC_TEMPLATES: DocTemplateDef[] = [
  {
    id: 'tpl_brief',
    name: 'Appellate brief',
    kind: 'Appellate Brief',
    description: 'Caption, statements, argument headings, and a certificate of service.',
    blocks: [
      caption,
      h('STATEMENT OF THE CASE'),
      p(
        'Enter the procedural history and the facts relevant to the issues on appeal. Cite the record. Replace this guidance with the statement.',
      ),
      h('STATEMENT OF THE ISSUES'),
      p('State each issue on appeal and the relief sought.'),
      h('ARGUMENT'),
      h('Standard of review', 2),
      p('Set out the standard of review from the controlling authority. Use References > Cite (Ctrl+Shift+A) so the authority is linked and checked.'),
      h('Discussion', 2),
      p(
        'Develop the argument under headings that state the point. cite:{none} Use Insert > Exhibit Cross-reference (Ctrl+Shift+E) for record exhibits.',
      ),
      certificate,
    ],
  },
  {
    id: 'tpl_motion',
    name: 'Motion',
    kind: 'Motion',
    description: 'Motion, memorandum, and certificate of service.',
    blocks: [
      caption,
      h('MOTION TO [TITLE]'),
      p('[Party] respectfully moves this Court for [relief]. The grounds are set out below.'),
      h('MEMORANDUM OF LAW'),
      p('Set out the facts and the argument. Cite authority with References > Cite.'),
      certificate,
    ],
  },
  {
    id: 'tpl_soq',
    name: 'Statement of questions',
    kind: 'Statement of Questions',
    description: 'Numbered questions presented with a certificate of service.',
    blocks: [
      caption,
      h('STATEMENT OF THE QUESTIONS PRESENTED'),
      p('1. Whether [question].'),
      p('2. Whether [question].'),
      certificate,
    ],
  },
  {
    id: 'tpl_toc',
    name: 'Table of contents',
    kind: 'Table of Contents',
    description: 'Live table of contents generated from the document headings.',
    blocks: [caption, { type: 'tableOfContents', text: '' }],
  },
  {
    id: 'tpl_toa',
    name: 'Table of authorities',
    kind: 'Table of Authorities',
    description: 'Live table generated from the authorities cited in the document.',
    blocks: [caption, { type: 'tableOfAuthorities', text: '' }],
  },
  {
    id: 'tpl_tos',
    name: 'Certificate of service',
    kind: 'Certificate of Service',
    description: 'Certificate generated from the case service contacts.',
    blocks: [caption, certificate],
  },
  {
    id: 'tpl_other',
    name: 'Blank document',
    kind: 'Other',
    description: 'Caption and an empty body.',
    blocks: [caption, h('TITLE'), p('')],
  },
]

export function templateBlocks(templateId: string, title: string): DocBlock[] {
  const template = DOC_TEMPLATES.find(t => t.id === templateId) ?? DOC_TEMPLATES[0]
  return template.blocks.map(b => ({
    ...b,
    id: uid('blk'),
    text: b.type === 'heading' && b.text === 'TITLE' ? title.toUpperCase() : b.text,
  }))
}

/* ------------------------------------------------------------------ */
/* Sample authority index                                              */
/* ------------------------------------------------------------------ */

/**
 * These are real, well-known federal citations shipped as index examples.
 * Summaries are written for this app; no opinion text is included. The
 * Vermont index is populated from published opinions once source terms are
 * confirmed (OQ-5).
 */
export const SEED_AUTHORITIES: Authority[] = [
  {
    id: 'auth_twombly',
    caseName: 'Bell Atlantic Corp. v. Twombly',
    court: 'U.S. Supreme Court',
    reporter: '550 U.S. 544',
    year: 2007,
    source: 'Manual',
    summary:
      'Holds that a complaint must contain enough facts to state a plausible claim for relief, not merely labels and conclusions.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/550/544/',
    cites: [],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
  {
    id: 'auth_iqbal',
    caseName: 'Ashcroft v. Iqbal',
    court: 'U.S. Supreme Court',
    reporter: '556 U.S. 662',
    year: 2009,
    source: 'Manual',
    summary:
      'Applies the plausibility standard to all civil actions and explains that courts use judicial experience and common sense in assessing a complaint.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/556/662/',
    cites: ['auth_twombly'],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
  {
    id: 'auth_anderson',
    caseName: 'Anderson v. Liberty Lobby, Inc.',
    court: 'U.S. Supreme Court',
    reporter: '477 U.S. 242',
    year: 1986,
    source: 'Manual',
    summary:
      'Sets out the summary judgment standard: no genuine dispute of material fact, viewing the record in the light most favorable to the nonmoving party.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/477/242/',
    cites: [],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
  {
    id: 'auth_celotex',
    caseName: 'Celotex Corp. v. Catrett',
    court: 'U.S. Supreme Court',
    reporter: '477 U.S. 317',
    year: 1986,
    source: 'Manual',
    summary:
      'Holds that summary judgment may be granted against a party who fails to make a showing sufficient to establish an element essential to its case.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/477/317/',
    cites: ['auth_anderson'],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
  {
    id: 'auth_crawford',
    caseName: 'Crawford v. Washington',
    court: 'U.S. Supreme Court',
    reporter: '541 U.S. 36',
    year: 2004,
    source: 'Manual',
    summary:
      'Holds that the Confrontation Clause bars admission of testimonial statements of a witness who does not appear at trial unless the witness was unavailable and the defendant had a prior opportunity to cross-examine.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/541/36/',
    cites: [],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
  {
    id: 'auth_strickland',
    caseName: 'Strickland v. Washington',
    court: 'U.S. Supreme Court',
    reporter: '466 U.S. 668',
    year: 1984,
    source: 'Manual',
    summary:
      'Sets the two-part test for ineffective assistance of counsel: deficient performance and a reasonable probability of a different result.',
    text: '',
    url: 'https://supreme.justia.com/cases/federal/us/466/668/',
    cites: [],
    addedAt: '2026-01-04T12:00:00.000Z',
    provenance: 'Sample index record. Confirm the citation and read the opinion before relying on it.',
  },
]

/* ------------------------------------------------------------------ */
/* Initial vault                                                       */
/* ------------------------------------------------------------------ */

export function createInitialData(user: string, settingsPatch?: Partial<Settings>): AppData {
  const at = nowIso()
  return {
    schemaVersion: SCHEMA_VERSION,
    initializedAt: at,
    user: user.trim() || 'Attorney',
    settings: {
      ...DEFAULT_SETTINGS,
      ...settingsPatch,
      approvedServices: settingsPatch?.approvedServices ?? DEFAULT_SETTINGS.approvedServices,
      backups: settingsPatch?.backups ?? DEFAULT_SETTINGS.backups,
      filingAttorneys: user.trim() ? [user.trim()] : [],
    },
    cases: [],
    deadlines: [],
    rules: SEED_RULES.map(r => ({ ...r })),
    contacts: [],
    caseContacts: [],
    notes: [],
    authorities: SEED_AUTHORITIES.map(a => ({ ...a, cites: [...a.cites] })),
    caseAuthorities: [],
    citations: [],
    documents: [],
    exhibits: [],
    filings: [],
    audit: [],
    trash: [],
  }
}
