import type { Question } from '@/state'
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

export const formPageAtom = atom(-1)

// Some single-choice questions also allow a typed amount instead of an
// immediately complete answer. Keep a manual path available for those too.
export const needsContinueButton = (question: Question) =>
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
  const requiredQuestions = questions
    // .filter((question) => question.required)
    .filter((question) => question.type !== 'section')
    .filter((question) => question.type !== 'text')
    .map((question) => question.id)

  const answeredQuestions = Object.keys(answers).filter((key) =>
    Boolean(answers[key])
  )
  const remainingQuestions = requiredQuestions.filter(
    (question) => !answeredQuestions.includes(question)
  )
  const indexesForRemainingQuestions = remainingQuestions.map((question) =>
    questions.findIndex((q) => q.id === question)
  )

  if (indexesForRemainingQuestions.length === 0) {
    return questions.length
  }

  const canScrollUpTo = Math.min(...indexesForRemainingQuestions)
  return canScrollUpTo
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
    a.questions.length === b.questions.length &&
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
    a.questions.length === b.questions.length &&
    JSON.stringify(a.answers) === JSON.stringify(b.answers)
)
