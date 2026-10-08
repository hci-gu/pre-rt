import type { Question } from '@/state'
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import { answerError } from './answers'

export const formPageAtom = atom(-1)

// Some single-choice questions also allow a typed amount instead of an
// immediately complete answer. Keep a manual path available for those too.
export const needsContinueButton = (question: Question) =>
  (!question.required && question.type !== 'section') ||
  question.type === 'multipleChoice' ||
  question.type === 'text' ||
  question.type === 'number' ||
  (question.type === 'singleChoice' &&
    Boolean(question.options?.value?.some(option => option.includes('{AMOUNT}'))))

export const getAnsweredUpTo = ({
  questions,
  answers,
}: {
  questions: Question[]
  answers: Record<string, unknown>
}) => {
  const firstInvalid = questions.findIndex(question => answerError(question, answers[question.id]))
  return firstInvalid < 0 ? questions.length : firstInvalid

}

export const getCanProceed = ({
  page,
  questions,
  answers,
}: {
  page: number
  questions: Question[]
  answers: Record<string, unknown>
}) => page < getAnsweredUpTo({ questions, answers }) && page < questions.length

export const answeredUpTo = atomFamily(
  ({
    questions,
    answers,
  }: {
    questions: Question[]
    answers: Record<string, unknown>
  }) =>
    atom(() => getAnsweredUpTo({ questions, answers })),
  (a, b) =>
    JSON.stringify(a.questions) === JSON.stringify(b.questions) &&
    JSON.stringify(a.answers) === JSON.stringify(b.answers)
)

export const canProceedAtom = atomFamily(
  ({
    questions,
    answers,
  }: {
    questions: Question[]
    answers: Record<string, unknown>
  }) =>
    atom((get) => {
      const page = get(formPageAtom)
      return getCanProceed({ page, questions, answers })
    }),
  (a, b) =>
    JSON.stringify(a.questions) === JSON.stringify(b.questions) &&
    JSON.stringify(a.answers) === JSON.stringify(b.answers)
)
