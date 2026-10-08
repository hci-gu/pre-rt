import type { Questionnaire } from '@/state'

const prefix = 'questionnaire-draft:v2:'
const legacyKey = /^[a-z0-9]{15}(?:-\d{4}-\d{2}(?:-\d{2})?)?$/
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function questionnaireDraftKey(questionnaire: Pick<Questionnaire, 'id' | 'occurrence'>, userId: string, date: Date) {
  const day = new Date(date)
  let period = ''
  switch (questionnaire.occurrence) {
    case 'daily': period = localDay(day); break
    case 'weekly': day.setDate(day.getDate() - day.getDay()); period = localDay(day); break
    case 'monthly': period = localDay(day).slice(0, 7); break
  }
  return `${prefix}${encodeURIComponent(userId)}:${questionnaire.id}${period ? ':' + period : ''}`
}

export function clearOtherParticipantDrafts(userId?: string) {
  try {
    const keep = userId ? `${prefix}${encodeURIComponent(userId)}:` : null
    for (const key of Object.keys(localStorage)) {
      if (legacyKey.test(key) || (key.startsWith(prefix) && (!keep || !key.startsWith(keep)))) localStorage.removeItem(key)
    }
  } catch { /* Storage can be disabled; user-scoped keys still prevent reads across accounts. */ }
}

export type QuestionnaireDraft = { answers: Record<string, unknown>; page: number; started?: string | null }

export function readQuestionnaireDraft(key: string): QuestionnaireDraft | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!value || typeof value.answers !== 'object' || value.answers === null || Array.isArray(value.answers) || !Number.isInteger(value.page)) return null
    return { ...value, started: typeof value.started === 'string' && Number.isFinite(Date.parse(value.started)) ? value.started : null }
  } catch { return null }
}

export function saveQuestionnaireDraft(key: string, draft: QuestionnaireDraft) {
  try { localStorage.setItem(key, JSON.stringify(draft)) } catch { /* Form remains usable without storage. */ }
}
