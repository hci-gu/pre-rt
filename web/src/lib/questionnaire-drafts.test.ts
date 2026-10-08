// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { clearOtherParticipantDrafts, questionnaireDraftKey, readQuestionnaireDraft, saveQuestionnaireDraft } from './questionnaire-drafts'

beforeEach(() => localStorage.clear())
it('isolates accounts and answer dates, discards legacy drafts and clears on logout', () => {
  const form = { id: 'u6917wm639q1d01', occurrence: 'daily' as const }
  const date = new Date(2026, 9, 7, 0, 15)
  const a = questionnaireDraftKey(form, 'user-a', date)
  const b = questionnaireDraftKey(form, 'user-b', date)
  const otherDay = questionnaireDraftKey(form, 'user-a', new Date(2026, 9, 6, 23, 50))
  expect(a.endsWith(':2026-10-07')).toBe(true)
  expect(a).not.toBe(otherDay)
  saveQuestionnaireDraft(a, { answers: { age: '57' }, page: 1 })
  localStorage.setItem(form.id, JSON.stringify({ age: '99' }))
  expect(readQuestionnaireDraft(b)).toBeNull()
  clearOtherParticipantDrafts('user-a')
  expect(readQuestionnaireDraft(a)?.answers.age).toBe('57')
  expect(localStorage.getItem(form.id)).toBeNull()
  clearOtherParticipantDrafts('user-b')
  expect(readQuestionnaireDraft(a)).toBeNull()
  saveQuestionnaireDraft(b, { answers: { age: '42' }, page: 0 })
  clearOtherParticipantDrafts()
  expect(readQuestionnaireDraft(b)).toBeNull()
})
it('treats malformed drafts as absent rather than crashing the form', () => {
  for (const value of ['broken json', 'null', '[]', '{"answers":null,"page":1}']) {
    localStorage.setItem('draft', value)
    expect(readQuestionnaireDraft('draft')).toBeNull()
  }
})
