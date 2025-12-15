import Pocketbase, { AuthModel } from 'pocketbase'
import { atomFamily, atomWithStorage, unwrap } from 'jotai/utils'
// @ts-ignore
import Cookies from 'js-cookie'
import { atom, useAtom } from 'jotai'
import { z } from 'zod'
import { dayStringFromDate } from './utils'
import { useEffect } from 'react'

export const pb = new Pocketbase(import.meta.env.VITE_API_URL)
const IS_PROD = import.meta.env.VITE_API_URL.startsWith('https')
pb.autoCancellation(false)

const setCookie = (key: string, value: string) =>
  Cookies.set(key, value, {
    secure: IS_PROD,
    sameSite: 'Lax',
    expires: 180,
  })

export const authAtom = atomWithStorage<AuthModel | null>(
  'auth',
  null,
  {
    getItem: (key, initialValue) => {
      let stored: string | undefined | null = Cookies.get(key)

      // Fallback to localStorage if cookie is missing
      if (!stored) {
        stored = localStorage.getItem(key)
        if (stored) {
          setCookie(key, stored)
        }
      }

      if (!stored) return initialValue

      try {
        const parsedAuth = JSON.parse(stored)
        pb.authStore.save(parsedAuth.token, parsedAuth.model)
        return pb.authStore.model
      } catch (error) {
        console.error('Error parsing auth storage:', error)
        Cookies.remove(key)
        localStorage.removeItem(key)
        return initialValue
      }
    },

    setItem: (key, value) => {
      if (value) {
        const authData = {
          token: pb.authStore.token,
          model: pb.authStore.model,
        }

        const serialized = JSON.stringify(authData)

        setCookie(key, serialized)
        localStorage.setItem(key, serialized)
      } else {
        Cookies.remove(key)
        localStorage.removeItem(key)
      }
    },
    removeItem: (key) => {
      Cookies.remove(key)
      localStorage.removeItem(key)
    },
  },
  { getOnInit: true }
)

export const userDataAtom = atom(async (get) => {
  const auth = get(authAtom)
  if (!auth) return null

  try {
    const response = await pb.collection('users').getOne(auth.id)
    return mapUser(response)
  } catch (e) {
    // throw out the auth token if the user doesn't exist
    Cookies.remove('auth')
    console.error(e)
    return null
  }
})

export const dailyQuestionnaireScheduleAtom = atom(async () => {
  const response = await pb.send('/daily-schedule', {})

  return {
    startDate: response.startDate ? new Date(response.startDate) : null,
    endDate: response.endDate ? new Date(response.endDate) : null,
  }
})

export const resourcesAtom = atom(async () => {
  const response = await pb.collection('resourceCollection').getFullList({
    expand: 'resources',
    filter: 'visible_on_questions_and_answers = true',
  })
  response.sort((a, b) => a.sort - b.sort)
  return response.map(mapResourceCollection)
})

export const resourceCollectionAtom = atomFamily((id: string) => {
  return atom(async () => {
    const response = await pb.collection('resourceCollection').getOne(id, {
      expand: 'resources',
    })
    return mapResourceCollection(response)
  })
})

export const readAboutPageAtom = atomWithStorage<boolean>(
  'readAboutPage',
  false
)

export type User = {
  id: string
  type: 'PRE' | 'POST'
  phoneNumber: string
  treatmentStart?: Date
  treatmentEnd?: Date
}

export type ResourceCollection = {
  id: string
  name: string
  resources: Resource[]
}

export type Resource = {
  id: string
  title: string
  description: string
}

export type QuestionOptions = {
  value: string[]
  followup: string[]
}

export type Question = {
  id: string
  text: string
  type:
    | 'text'
    | 'number'
    | 'painScale'
    | 'singleChoice'
    | 'multipleChoice'
    | 'date'
    | 'section'
  required: boolean
  placeholder?: string
  options?: QuestionOptions
  dependency?: string
  followup: string[]
  dependencyValue?: any
  resource?: Resource
  resourceCollection?: ResourceCollection
  number: number
}

export type Questionnaire = {
  id: string
  name: string
  description: string
  occurrence: 'daily' | 'weekly' | 'monthly' | 'once'
  questions: Question[]
}

export type Answer = {
  id: string
  user: string
  questionnaire: string
  answers: Record<string, any>
  created: string
  date: string
}

const mapUser = (user: any): User => {
  return {
    id: user.id,
    type: user.type,
    phoneNumber: user.phoneNumber,
    treatmentStart: user.treatmentStart
      ? new Date(user.treatmentStart)
      : undefined,
    treatmentEnd: user.treatmentEnd ? new Date(user.treatmentEnd) : undefined,
  }
}

const mapResource = (resource: any): Resource => {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
  }
}

const mapResourceCollection = (resourceCollection: any): ResourceCollection => {
  return {
    id: resourceCollection.id,
    name: resourceCollection.name,
    resources: resourceCollection.expand?.resources.map(mapResource),
  }
}

const mapQuestionOption = (
  questionOption: any
): QuestionOptions | undefined => {
  if (!questionOption) return undefined
  return {
    value: questionOption.value,
    followup: questionOption.followup,
  }
}

const mapQuestion = (question: any): Question => {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    required: question.required,
    placeholder: question.placeholder,
    options: mapQuestionOption(question.expand?.options),
    dependency: question.dependency,
    dependencyValue: question.dependencyValue,
    followup: question.followup,
    resource: question.expand?.resource,
    resourceCollection: question.expand?.resourceCollection
      ? mapResourceCollection(question.expand?.resourceCollection)
      : undefined,
    number: -1,
  }
}

const mapQuestionnaire = (questionnaire: any): Questionnaire => {
  return {
    id: questionnaire.id,
    name: questionnaire.name,
    description: questionnaire.description,
    occurrence: questionnaire.occurrence,
    questions: questionnaire.expand?.questions.map(mapQuestion) ?? [],
  }
}

const mapAnswer = (answer: any): Answer => {
  return {
    id: answer.id,
    user: answer.user,
    questionnaire: answer.questionnaire,
    answers: answer.answers,
    created: answer.created,
    date: answer.date,
  }
}

const questionnairesBaseAtom = atom<Promise<Questionnaire[]>>(async () => {
  const response = await pb.collection('questionnaires').getFullList({
    expand: 'questions',
  })

  return response.map(mapQuestionnaire)
})

export const questionnairesAtom = unwrap(questionnairesBaseAtom)

export const questionnaireAtom = atomFamily((id: string) =>
  atom(async () => {
    const response = await pb.collection('questionnaires').getOne(id, {
      expand:
        'questions,questions.options,questions.resource,questions.resourceCollection.resources',
    })

    return mapQuestionnaire(response)
  })
)

export const formStateAtom = atomFamily((id: string) =>
  atom(async (get) => {
    const questionnaire = await get(questionnaireAtom(id))

    const formSchema = z.object(
      questionnaire.questions.reduce((acc, q) => {
        switch (q.type) {
          case 'singleChoice':
          case 'multipleChoice':
            acc[q.id] = z.any()
            break
          case 'painScale':
            acc[q.id] = z.number().int().min(0).max(10)
            break
          case 'date':
            acc[q.id] = z.date()
            break
          default:
            acc[q.id] = q.type === 'text' ? z.string() : z.string().nullable()
        }

        if (!q.required) {
          acc[q.id] = acc[q.id].optional()
        }
        return acc
      }, {} as Record<string, z.ZodType<any>>)
    )

    return formSchema
  })
)

export const answersForQuestionnaireAtom = atomFamily((id: string) => {
  const dataAtom = atom<Answer[]>([])

  const fetchAtom = atom(null, async (_get, set) => {
    try {
      const response = await pb.collection('answers').getList(0, 100, {
        filter: `questionnaire = "${id}"`,
      })
      console.log(response)
      set(dataAtom, response.items.map(mapAnswer))
    } catch (e) {
      console.error(e)
      set(dataAtom, [])
    }
  })

  const combinedAtom = atom(
    (get) => get(dataAtom),
    (_get, set) => set(fetchAtom)
  )

  return combinedAtom
})

export const useAnswers = (questionnaireId: string) => {
  const [answers, refreshAnswers] = useAtom(
    answersForQuestionnaireAtom(questionnaireId)
  )

  useEffect(() => {
    if (questionnaireId) {
      refreshAnswers()
    }
  }, [questionnaireId, refreshAnswers])

  return answers
}

export const submitQuestionnaire = async (
  questionnaireId: string,
  answers: any,
  date: string | null = null
) => {
  const response = await pb.collection('answers').create({
    user: pb.authStore.model?.id,
    questionnaire: questionnaireId,
    answers,
    date: date ? new Date(date) : dayStringFromDate(new Date()),
  })
  return response
}
