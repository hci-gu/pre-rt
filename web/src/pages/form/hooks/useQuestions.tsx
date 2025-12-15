import { Questionnaire } from '@/state'
import { useAtomValue } from 'jotai'
import { useWatch } from 'react-hook-form'
import { formPageAtom } from '../state'

const compare = (answer: any, dependencyValue: any) => {
  if (Array.isArray(answer)) {
    return answer.includes(dependencyValue)
  }
  return answer === dependencyValue
}

const useQuestions = (questionnaire: Questionnaire) => {
  const values = useWatch()

  let questionNumber = 1
  const followupQuestions = new Set()
  for (const question of questionnaire.questions) {
    for (const followup of question.followup) {
      followupQuestions.add(followup)
    }
  }

  const questions = questionnaire.questions
    .filter((question) => !followupQuestions.has(question.id))
    .filter((question) => {
      if (question.dependency) {
        if (Array.isArray(question.dependencyValue)) {
          const [method, dependencyValue] = question.dependencyValue

          if (method == 'NOT') {
            return !compare(values[question.dependency], dependencyValue)
          }
        }

        return compare(values[question.dependency], question.dependencyValue)
      }
      return true
    })

  let questionsToInsert = []
  for (const question of questions) {
    if (question.followup.length) {
      const shouldAdd = compare(values[question.id], question.dependencyValue)
      if (shouldAdd) {
        for (const followup of question.followup) {
          const followupQuestion = questionnaire.questions.find(
            (q) => q.id === followup
          )

          if (followupQuestion) {
            const cloned = { ...followupQuestion }
            cloned.id = `${question.id}_${followupQuestion.id}`
            questionsToInsert.push(cloned)
          }
        }
      }
    }
  }

  for (const question of questionsToInsert) {
    const originalQuestionID = question.id.split('_')[0]
    const questionIndex = questions.findIndex(
      (q) => q.id === originalQuestionID
    )

    if (questionIndex !== -1) {
      questions.splice(questionIndex + 1, 0, question)
    }
  }

  for (const fQuestionnaire of questionnaire.followup ?? []) {
    let anyMatched = false
    for (const questionId of fQuestionnaire.dependency) {
      if (compare(values[questionId], fQuestionnaire.dependencyValue)) {
        anyMatched = true
      }
    }
    if (anyMatched) {
      for (const question of fQuestionnaire.questions) {
        if (!question.dependency) {
          const cloned = { ...question }
          cloned.id = `followup_${fQuestionnaire.id}_${question.id}`
          questions.push(cloned)
        } else if (
          compare(
            values[`followup_${fQuestionnaire.id}_${question.dependency}`],
            question.dependencyValue
          )
        ) {
          const cloned = { ...question }
          cloned.id = `followup_${fQuestionnaire.id}_${question.id}`
          questions.push(cloned)
        }
      }
    }
  }

  return questions.map((question) => {
    if (question.type !== 'section') {
      question.number = questionNumber
      questionNumber++
    }
    return question
  })
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
