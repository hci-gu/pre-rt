import { describe, expect, it } from 'vitest'
import type { Questionnaire } from '@/state'
import { keyForQuestionnaire } from './useFormState'

const questionnaire = (
  id: string,
  occurrence: Questionnaire['occurrence']
): Questionnaire => ({
  id,
  name: id,
  description: '',
  occurrence,
  questions: [],
  dependency: [],
})

describe('keyForQuestionnaire', () => {
  const date = new Date('2026-07-07T12:00:00.000Z')

  it('uses stable keys for one-time questionnaires', () => {
    expect(keyForQuestionnaire(questionnaire('baseline', 'once'), date, 'participant')).toBe(
      'questionnaire-draft:v2:participant:baseline'
    )
  })

  it('includes the current date for daily questionnaires', () => {
    expect(keyForQuestionnaire(questionnaire('daily', 'daily'), date, 'participant')).toBe(
      'questionnaire-draft:v2:participant:daily:2026-07-07'
    )
  })

  it('uses the configured first day of week for weekly questionnaires', () => {
    expect(keyForQuestionnaire(questionnaire('weekly', 'weekly'), date, 'participant')).toBe(
      'questionnaire-draft:v2:participant:weekly:2026-07-05'
    )
  })

  it('uses year-month for monthly questionnaires', () => {
    expect(keyForQuestionnaire(questionnaire('monthly', 'monthly'), date, 'participant')).toBe(
      'questionnaire-draft:v2:participant:monthly:2026-07'
    )
  })
})
