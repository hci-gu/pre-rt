import { describe, expect, it } from 'vitest'
import type { Question, Questionnaire } from '@/state'
import { answerError, prepareSubmission } from './answers'

const q = (id: string, overrides: Partial<Question> = {}): Question => ({ id, text: id, type: 'singleChoice', required: false, followup: [], number: 0, ...overrides })
const form = (questions: Question[], overrides: Partial<Questionnaire> = {}): Questionnaire => ({ id: 'baseline', name: 'Baseline', description: '', occurrence: 'once', dependency: [], questions, ...overrides })

describe('final active submission', () => {
  const baseline = form([
    q('trial'), q('size', { dependency: 'trial', dependencyValue: 'Ja' }),
    q('length', { dependency: 'trial', dependencyValue: 'Ja' }), q('violence'),
    q('choice', { type: 'multipleChoice', options: { value: ['A', 'B'], followup: ['Often', 'Never'] } }),
  ], { followup: [form([q('symptom'), q('details', { dependency: 'symptom', dependencyValue: 'Other' })], { id: 'pcl', dependency: ['violence'], dependencyValue: 'Ja' })] })
  it('removes hidden trial, PCL and deselected option follow-ups, without mutating the editing draft', () => {
    const draft = { trial: 'Nej', size: 'Mindre', length: '2cm', violence: 'Nej', followup_pcl_symptom: 'Other', followup_pcl_details: 'Sensitive', choice: ['B'], choice_0: 'Often', choice_1: 'Never' }
    const result = prepareSubmission(baseline, draft)
    expect(result.answers).toEqual({ trial: 'Nej', violence: 'Nej', choice: ['B'], choice_1: 'Never' })
    expect(result.errors).toEqual([])
    expect(draft.followup_pcl_details).toBe('Sensitive')
  })
  it('preserves valid active composite keys and checks required follow-up answers', () => {
    const active = form([q('gate', { followup: ['detail'], dependencyValue: 'Ja' }), q('detail', { type: 'text', required: true })])
    expect(prepareSubmission(active, { gate: 'Ja', gate_detail: 'Kept' }).answers).toEqual({ gate: 'Ja', gate_detail: 'Kept' })
    expect(prepareSubmission(active, { gate: 'Ja' }).errors[0].id).toBe('gate_detail')
    expect(prepareSubmission(active, { gate: 'Nej', gate_detail: 'Removed' }).answers).toEqual({ gate: 'Nej' })
  })
  it('re-evaluates downstream conditions after removing an inactive parent answer', () => {
    const chain = form([q('gate'), q('parent', { dependency: 'gate', dependencyValue: 'Ja' }), q('child', { dependency: 'parent', dependencyValue: 'Ja' })])
    expect(prepareSubmission(chain, { gate: 'Nej', parent: 'Ja', child: 'stale' }).answers).toEqual({ gate: 'Nej' })
  })
  it('validates optional provided values and required empty values consistently', () => {
    expect(answerError(q('age', { type: 'number', placeholder: 'år' }), '')).toBeUndefined()
    for (const value of ['-12', '1.5', 'NaN', 'Infinity', {}]) expect(answerError(q('age', { type: 'number', placeholder: 'år' }), value)).toBeTruthy()
    expect(answerError(q('weight', { type: 'number', placeholder: 'kg' }), '0')).toBeTruthy()
    expect(answerError(q('weight', { type: 'number', placeholder: 'kg' }), '72.5')).toBeUndefined()
    expect(answerError(q('pain', { type: 'painScale', required: true }), '0')).toBeUndefined()
    expect(answerError(q('comment', { type: 'text', required: true }), '')).toBeTruthy()
  })
})
