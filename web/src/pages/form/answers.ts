import type { Question, Questionnaire } from '@/state'
import { buildQuestions } from './questions'

export const emptyAnswer = (value: unknown) => value == null ||
  (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0)

export const matchesOption = (answer: unknown, option: string) => typeof answer === 'string' &&
  answer.replace(/\{[^}]*\}/g, '{AMOUNT}') === option.replace(/\{[^}]*\}/g, '{AMOUNT}')

export function answerError(question: Question, value: unknown): string | undefined {
  if (question.type === 'section') return
  if (emptyAnswer(value)) return question.required ? 'Svara på frågan för att gå vidare.' : undefined
  switch (question.type) {
    case 'number': {
      if (typeof value !== 'string' && typeof value !== 'number') return 'Ange ett giltigt tal.'
      const number = Number(value)
      if (!Number.isFinite(number) || number < 0) return 'Ange ett tal som är 0 eller större.'
      if (question.placeholder === 'år' && !Number.isInteger(number)) return 'Ange ålder i hela år.'
      if (['cm', 'kg'].includes(question.placeholder ?? '') && number <= 0) return 'Ange ett tal större än 0.'
      return
    }
    case 'painScale': {
      const number = Number(value)
      return !['string', 'number'].includes(typeof value) || !Number.isInteger(number) || number < 0 || number > 10
        ? 'Välj ett värde mellan 0 och 10.' : undefined
    }
    case 'date':
      return (value instanceof Date || typeof value === 'string') && !Number.isNaN(new Date(value).getTime())
        ? undefined : 'Välj ett giltigt datum.'
    case 'text':
      return typeof value === 'string' ? undefined : 'Ange ett textsvar.'
    case 'multipleChoice':
    case 'singleChoice': {
      if (question.type === 'multipleChoice' ? !Array.isArray(value) : typeof value !== 'string') return 'Välj ett svar.'
      const values = Array.isArray(value) ? value : [value]
      for (const selected of values) {
        if (typeof selected !== 'string') return 'Välj ett giltigt svar.'
        const option = question.options?.value.find(option => matchesOption(selected, option))
        if (question.options?.value.length && !option) return 'Välj ett giltigt svar.'
        if (option?.includes('{AMOUNT}')) {
          const amount = selected.match(/\{([^}]*)\}/)?.[1]
          if (!amount?.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0) return 'Fyll i ett giltigt tal som är 0 eller större.'
          if (/års? ålder/.test(option) && !Number.isInteger(Number(amount))) return 'Ange ålder i hela år.'
        }
      }
      return
    }
  }
}

export function prepareSubmission(questionnaire: Questionnaire, values: Record<string, unknown>) {
  let answers = { ...values }
  let questions = buildQuestions(questionnaire, answers)
  // Repeat after removal so a stale answer on an inactive parent cannot keep
  // another conditional branch active. Values may stay in the editing draft.
  for (let pass = 0; pass <= Object.keys(values).length; pass++) {
    const active = new Set<string>()
    for (const question of questions) {
      if (question.type === 'section') continue
      active.add(question.id)
      if (question.options?.followup?.length) {
        const selected = Array.isArray(answers[question.id]) ? answers[question.id] as unknown[] : [answers[question.id]]
        question.options.value.forEach((option, index) => {
          if (selected.some(value => matchesOption(value, option))) active.add(`${question.id}_${index}`)
        })
      }
    }
    const filtered = Object.fromEntries(Object.entries(answers).filter(([key]) => active.has(key)))
    if (Object.keys(filtered).length === Object.keys(answers).length) break
    answers = filtered
    questions = buildQuestions(questionnaire, answers)
  }
  const errors = questions.flatMap((question, index) => {
    const message = answerError(question, answers[question.id])
    return message ? [{ id: question.id, index, message }] : []
  })
  return { answers, errors }
}
