import type {
  AppData,
  Deadline,
  DeadlineRule,
  DeadlineStatus,
  ISODate,
  MatterCase,
} from './types'
import { addDays, daysFromToday, deadlineStatus, parseIsoDate, rollToBusinessDay, todayIso } from './util'

export interface DeadlinePreview {
  rule: DeadlineRule
  date: ISODate
}

export function computeDeadlineDate(
  triggerDate: ISODate,
  rule: DeadlineRule,
  holidays: string[] = [],
): ISODate {
  const base = addDays(triggerDate, rule.days)
  return rule.rollWeekend ? rollToBusinessDay(base, holidays) : base
}

export function rulesForTrigger(rules: DeadlineRule[], trigger: string): DeadlineRule[] {
  return rules.filter(r => r.trigger === trigger)
}

export function previewDeadlines(
  rules: DeadlineRule[],
  trigger: string,
  triggerDate: ISODate,
  holidays: string[] = [],
): DeadlinePreview[] {
  if (!triggerDate) return []
  return rulesForTrigger(rules, trigger).map(rule => ({
    rule,
    date: computeDeadlineDate(triggerDate, rule, holidays),
  }))
}

export function buildDeadlines(
  caseId: string,
  rules: DeadlineRule[],
  trigger: string,
  triggerDate: ISODate,
  holidays: string[] = [],
): Deadline[] {
  if (!triggerDate) return []
  const created = new Date().toISOString()
  return previewDeadlines(rules, trigger, triggerDate, holidays).map(({ rule, date }) => ({
    id: crypto.randomUUID(),
    caseId,
    ruleId: rule.id,
    title: rule.name,
    triggerLabel: rule.trigger,
    triggerDate,
    computedDate: date,
    createdAt: created,
  }))
}

export function deadlineDate(d: Deadline): ISODate {
  return d.override?.date || d.computedDate
}

export function deadlineState(d: Deadline): DeadlineStatus {
  return deadlineStatus(deadlineDate(d), Boolean(d.override))
}

export function caseDeadlines(data: AppData, caseId: string): Deadline[] {
  return data.deadlines
    .filter(d => d.caseId === caseId)
    .sort((a, b) => deadlineDate(a).localeCompare(deadlineDate(b)))
}

export function nextDeadline(data: AppData, caseId: string): Deadline | undefined {
  const today = todayIso()
  return caseDeadlines(data, caseId)
    .filter(d => deadlineDate(d) >= today)
    .sort((a, b) => deadlineDate(a).localeCompare(deadlineDate(b)))[0]
}

export function upcomingDeadlines(
  data: AppData,
  withinDays = 7,
): { deadline: Deadline; matter: MatterCase }[] {
  const today = todayIso()
  const liveCases = new Map(
    data.cases.filter(c => !c.deletedAt && c.status === 'Active').map(c => [c.id, c]),
  )
  return data.deadlines
    .filter(d => {
      const diff = daysFromToday(deadlineDate(d))
      return diff >= 0 && diff <= withinDays && liveCases.has(d.caseId)
    })
    .sort((a, b) => deadlineDate(a).localeCompare(deadlineDate(b)))
    .map(d => ({ deadline: d, matter: liveCases.get(d.caseId)! }))
}

export function overdueCount(data: AppData): number {
  const activeCases = new Set(data.cases.filter(c => !c.deletedAt).map(c => c.id))
  return data.deadlines.filter(
    d => activeCases.has(d.caseId) && !d.override && daysFromToday(deadlineDate(d)) < 0,
  ).length
}

export function dueSoonCount(data: AppData): number {
  const activeCases = new Set(data.cases.filter(c => !c.deletedAt).map(c => c.id))
  return data.deadlines.filter(d => {
    if (!activeCases.has(d.caseId) || d.override) return false
    const diff = daysFromToday(deadlineDate(d))
    return diff >= 0 && diff <= 7
  }).length
}

export function monthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push(d)
  }
  return cells
}

export function weekCells(anchor: ISODate): Date[] {
  const d = parseIsoDate(anchor)
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    return x
  })
}

export function caseCountdown(data: AppData, caseId: string): string {
  const next = nextDeadline(data, caseId)
  if (!next) return 'No upcoming deadline'
  const diff = daysFromToday(deadlineDate(next))
  const when =
    diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : diff > 1 ? `in ${diff} days` : `${Math.abs(diff)} days overdue`
  return `${next.title} ${when}`
}
