import type { Questionnaire } from '@/state'
import { useAtomValue } from 'jotai'
import { useWatch } from 'react-hook-form'
import { formPageAtom } from '../state'

import { buildQuestions } from '../questions'
export { buildQuestions, compareAnswer } from '../questions'

const useQuestions = (questionnaire: Questionnaire) => {
  const values = useWatch()

  return buildQuestions(questionnaire, values)
}

export const useCurrentSection = (questionnaire: Questionnaire) => {
  const questions = useQuestions(questionnaire)
  const page = useAtomValue(formPageAtom)
  const sectionIndexes = questions.reduce<number[]>((acc, question, index) => {
    if (question.type === 'section') {
      acc.push(index)
    }
    return acc
  }, [])

  const activeSectionIndex = sectionIndexes
    .filter((index) => index <= page)
    .pop()

  const question = questions[activeSectionIndex ?? -1]

  return question
}

export default useQuestions
