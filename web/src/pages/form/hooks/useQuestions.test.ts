import { describe, expect, it } from 'vitest'
import type { Question, Questionnaire } from '@/state'
import { buildQuestions, compareAnswer } from './useQuestions'
import { isSensitivePage } from '../questionnaire-safety'
import { QUESTIONNAIRE_PCL5_ID, QUESTIONNAIRE_FOV_ID } from '@/constants'

const question = (
  overrides: Partial<Question> & Pick<Question, 'id' | 'type'>
): Question => ({
  id: overrides.id,
  text: overrides.text ?? overrides.id,
  type: overrides.type,
  required: overrides.required ?? true,
  placeholder: overrides.placeholder,
  options: overrides.options,
  dependency: overrides.dependency,
  dependencyValue: overrides.dependencyValue,
  followup: overrides.followup ?? [],
  resource: overrides.resource,
  resourceCollection: overrides.resourceCollection,
  number: overrides.number ?? -1,
})

const questionnaire = (
  overrides: Partial<Questionnaire> & Pick<Questionnaire, 'questions'>
): Questionnaire => ({
  id: overrides.id ?? 'questionnaire',
  name: overrides.name ?? 'Questionnaire',
  description: overrides.description ?? '',
  introText: overrides.introText,
  occurrence: overrides.occurrence ?? 'once',
  questions: overrides.questions,
  dependency: overrides.dependency ?? [],
  dependencyValue: overrides.dependencyValue,
  followup: overrides.followup,
})

describe('compareAnswer', () => {
  it('matches scalar and multi-select answers', () => {
    expect(compareAnswer('Yes', 'Yes')).toBe(true)
    expect(compareAnswer('No', 'Yes')).toBe(false)
    expect(compareAnswer(['A', 'B'], 'B')).toBe(true)
    expect(compareAnswer(['A', 'B'], 'C')).toBe(false)
  })
})

describe('sensitive questionnaire pages', () => {
  it('keeps PCL-5 closing and submit screens protected after the section ID changes', () => {
    const pcl = questionnaire({ id: 'pcl-form', dependency: ['gate'], dependencyValue: 'Ja', questions: [
      question({ id: QUESTIONNAIRE_PCL5_ID, type: 'section' }),
      question({ id: 'symptom', type: 'singleChoice' }),
      question({ id: 'closing-support', type: 'section' }),
    ] })
    const baseline = questionnaire({ questions: [question({ id: 'gate', type: 'singleChoice' })], followup: [pcl] })
    const questions = buildQuestions(baseline, { gate: 'Ja' })
    expect(isSensitivePage(baseline, questions, 0)).toBe(false)
    for (const page of [1, 2, 3, 4]) expect(isSensitivePage(baseline, questions, page)).toBe(true)
    expect(isSensitivePage(pcl, buildQuestions(pcl), 2)).toBe(true)
    const noFollowup = buildQuestions(baseline, { gate: 'Nej' })
    expect(isSensitivePage(baseline, noFollowup, noFollowup.length)).toBe(false)
  })

  it('retains violence-section protection without exposing quick exit on unrelated forms', () => {
    const form = questionnaire({ questions: [question({ id: QUESTIONNAIRE_FOV_ID, type: 'section' }), question({ id: 'violence-question', type: 'singleChoice' })] })
    const questions = buildQuestions(form)
    expect(isSensitivePage(form, questions, -1)).toBe(false)
    expect(isSensitivePage(form, questions, 1)).toBe(true)
    expect(isSensitivePage(form, questions, 2)).toBe(true)
  })
})

describe('buildQuestions', () => {
  it('hides inline follow-ups by default and inserts them after the triggering answer', () => {
    const source = questionnaire({
      questions: [
        question({
          id: 'gate',
          type: 'singleChoice',
          dependencyValue: 'Yes',
          followup: ['gate_detail'],
        }),
        question({ id: 'gate_detail', type: 'text' }),
        question({ id: 'after_gate', type: 'painScale' }),
      ],
    })

    expect(buildQuestions(source).map((item) => item.id)).toEqual([
      'gate',
      'after_gate',
    ])

    expect(buildQuestions(source, { gate: 'Yes' }).map((item) => item.id)).toEqual([
      'gate',
      'gate_gate_detail',
      'after_gate',
    ])
  })

  it('applies dependencies, NOT dependencies, and multi-select dependencies', () => {
    const source = questionnaire({
      questions: [
        question({ id: 'multi', type: 'multipleChoice' }),
        question({
          id: 'shown_for_b',
          type: 'singleChoice',
          dependency: 'multi',
          dependencyValue: 'B',
        }),
        question({
          id: 'hidden_for_c',
          type: 'singleChoice',
          dependency: 'multi',
          dependencyValue: ['NOT', 'C'],
        }),
      ],
    })

    expect(buildQuestions(source, { multi: ['A', 'B'] }).map((item) => item.id)).toEqual([
      'multi',
      'shown_for_b',
      'hidden_for_c',
    ])

    expect(buildQuestions(source, { multi: ['C'] }).map((item) => item.id)).toEqual([
      'multi',
    ])
  })

  it('appends dependency-matched follow-up questionnaires', () => {
    const source = questionnaire({
      questions: [question({ id: 'gate', type: 'singleChoice' })],
      followup: [
        questionnaire({
          id: 'followup_form',
          dependency: ['gate'],
          dependencyValue: 'Yes',
          questions: [
            question({ id: 'first', type: 'singleChoice' }),
            question({
              id: 'second',
              type: 'singleChoice',
              dependency: 'first',
              dependencyValue: 'Continue',
            }),
          ],
        }),
      ],
    })

    expect(buildQuestions(source, { gate: 'No' }).map((item) => item.id)).toEqual([
      'gate',
    ])

    expect(buildQuestions(source, { gate: 'Yes' }).map((item) => item.id)).toEqual([
      'gate',
      'followup_followup_form_first',
    ])

    expect(
      buildQuestions(source, {
        gate: 'Yes',
        followup_followup_form_first: 'Continue',
      }).map((item) => item.id)
    ).toEqual(['gate', 'followup_followup_form_first', 'followup_followup_form_second'])
  })

  it('renumbers visible non-section questions without mutating source questions', () => {
    const source = questionnaire({
      questions: [
        question({ id: 'intro', type: 'section' }),
        question({ id: 'first', type: 'text' }),
        question({ id: 'second', type: 'painScale' }),
      ],
    })

    const visible = buildQuestions(source)

    expect(visible.map((item) => [item.id, item.number])).toEqual([
      ['intro', -1],
      ['first', 1],
      ['second', 2],
    ])
    expect(source.questions.map((item) => item.number)).toEqual([-1, -1, -1])
  })
})
