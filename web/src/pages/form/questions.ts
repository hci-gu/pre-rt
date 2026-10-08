import type { Questionnaire } from '@/state'

type AnswerValues = Record<string, unknown>

export const compareAnswer = (answer: unknown, dependencyValue: unknown) => {
  if (Array.isArray(answer)) {
    return answer.includes(dependencyValue)
  }
  return answer === dependencyValue
}

export const buildQuestions = (
  questionnaire: Questionnaire,
  values: AnswerValues = {}
) => {
  let questionNumber = 1
  const followupQuestions = new Set<string>()
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

          if (method === 'NOT') {
            return !compareAnswer(values[question.dependency], dependencyValue)
          }
        }

        return compareAnswer(
          values[question.dependency],
          question.dependencyValue
        )
      }
      return true
    })
    .map((question) => ({ ...question }))

  const questionsToInsert: Questionnaire['questions'] = []
  for (const question of questions) {
    if (question.followup.length) {
      const shouldAdd = compareAnswer(
        values[question.id],
        question.dependencyValue
      )
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
      if (compareAnswer(values[questionId], fQuestionnaire.dependencyValue)) {
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
          compareAnswer(
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
      question = { ...question, number: questionNumber }
      questionNumber++
    }
    return question
  })
}
