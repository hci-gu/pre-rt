import { describe, expect, it } from 'vitest'
import type { Question } from '@/state'
import { getAnsweredUpTo, getCanProceed, needsContinueButton } from './state'

const question = (id: string, type: Question['type']): Question => ({
  id,
  text: id,
  type,
  required: true,
  followup: [],
  number: -1,
})

describe('questionnaire navigation state helpers', () => {
  it('allows optional unanswered questions but rejects invalid provided answers', () => {
    const optional = { ...question('age', 'number'), required: false, placeholder: 'år' }
    expect(getCanProceed({ page: 0, questions: [optional], answers: {} })).toBe(true)
    expect(getCanProceed({ page: 0, questions: [optional], answers: { age: '-12' } })).toBe(false)
    expect(getCanProceed({ page: 0, questions: [optional], answers: { age: '2.5' } })).toBe(false)
    expect(getCanProceed({ page: 0, questions: [optional], answers: { age: '57' } })).toBe(true)
  })

  it('does not treat an empty selection as a required answer', () => {
    expect(getCanProceed({ page: 0, questions: [question('choice', 'multipleChoice')], answers: { choice: [] } })).toBe(false)
  })

  it('blocks an incomplete typed amount even when the question is optional', () => {
    const amount = { ...question('amount', 'singleChoice'), required: false, options: { value: ['Aldrig', 'Vid {AMOUNT} års ålder'], followup: [] } }
    expect(getCanProceed({ page: 0, questions: [amount], answers: { amount: 'Vid {AMOUNT} års ålder' } })).toBe(false)
    expect(getCanProceed({ page: 0, questions: [amount], answers: { amount: 'Vid {-2} års ålder' } })).toBe(false)
  })
  it.each([
    ['multipleChoice', true], ['text', true], ['number', true],
    ['singleChoice', false], ['painScale', false], ['date', false], ['section', false],
  ] as const)('shows a continue button for %s: %s', (type, expected) => {
    expect(needsContinueButton(question('test', type))).toBe(expected)
  })

  it('provides a manual path for single-choice answers containing a typed amount', () => {
    expect(needsContinueButton({
      ...question('amount', 'singleChoice'),
      options: { value: ['Inga', 'Använt {AMOUNT} gånger'], followup: [] },
    })).toBe(true)
  })
  const questions = [
    { ...question('intro_text', 'text'), required: false },
    question('intro_section', 'section'),
    question('first_required', 'singleChoice'),
    question('second_required', 'painScale'),
  ]

  it('ignores text and section pages when finding the first unanswered question', () => {
    expect(getAnsweredUpTo({ questions, answers: {} })).toBe(2)
  })

  it('returns the first unanswered required question index', () => {
    expect(
      getAnsweredUpTo({
        questions,
        answers: {
          first_required: 'Yes',
        },
      })
    ).toBe(3)
  })

  it('allows proceeding only while the next page is within answered bounds', () => {
    expect(
      getCanProceed({
        page: 2,
        questions,
        answers: {
          first_required: 'Yes',
        },
      })
    ).toBe(true)

    expect(
      getCanProceed({
        page: 3,
        questions,
        answers: {
          first_required: 'Yes',
        },
      })
    ).toBe(false)
  })

  it('returns question count when all required questions are answered', () => {
    expect(
      getAnsweredUpTo({
        questions,
        answers: {
          first_required: 'Yes',
          second_required: '7',
        },
      })
    ).toBe(questions.length)
  })
})
