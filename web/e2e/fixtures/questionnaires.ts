import type { Page } from '@playwright/test'

type QuestionType =
  | 'text'
  | 'number'
  | 'painScale'
  | 'singleChoice'
  | 'multipleChoice'
  | 'date'
  | 'section'

type MockQuestionOptions = {
  value: string[]
  followup: string[]
}

export type MockQuestion = {
  id: string
  text: string
  type: QuestionType
  required: boolean
  placeholder?: string
  dependency?: string
  dependencyValue?: unknown
  followup: string[]
  expand?: {
    options?: MockQuestionOptions
    resource?: { id: string; title: string; description: string }
  }
}

export type MockQuestionnaire = {
  id: string
  name: string
  description: string
  introText: string
  occurrence: 'daily' | 'weekly' | 'monthly' | 'once'
  dependency: string[]
  dependencyValue?: unknown
  expand?: {
    questions?: MockQuestion[]
    followup?: MockQuestionnaire[]
  }
}

export type MockAnswer = {
  id: string
  user: string
  questionnaire: string
  answers: Record<string, unknown>
  created: string
  date: string
}

export type SubmittedAnswer = {
  user?: string
  questionnaire?: string
  answers?: Record<string, unknown>
  date?: string
}

type MockApiOptions = {
  existingAnswers?: MockAnswer[]
  submitStatus?: number
}

type MockQuestionnaireInput = {
  id: string
  name: string
  questions: MockQuestion[]
  introText?: string
  occurrence?: MockQuestionnaire['occurrence']
  dependency?: string[]
  dependencyValue?: unknown
  followup?: MockQuestionnaire[]
}

const answerTimestamp = '2026-07-07 12:00:00.000Z'

export const mockQuestion = ({
  id,
  text,
  type,
  options,
  optionFollowups = [],
  required = true,
  placeholder,
  dependency,
  dependencyValue,
  followup = [],
}: {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  optionFollowups?: string[]
  required?: boolean
  placeholder?: string
  dependency?: string
  dependencyValue?: unknown
  followup?: string[]
}): MockQuestion => ({
  id,
  text,
  type,
  required,
  placeholder,
  dependency,
  dependencyValue,
  followup,
  expand: options
    ? {
        options: {
          value: options,
          followup: optionFollowups,
        },
      }
    : undefined,
})

export const mockQuestionnaire = ({
  id,
  name,
  questions,
  introText = '<p>Mockad introduktion för test.</p>',
  occurrence = 'once',
  dependency = [],
  dependencyValue,
  followup,
}: MockQuestionnaireInput): MockQuestionnaire => ({
  id,
  name,
  description: introText,
  introText,
  occurrence,
  dependency,
  dependencyValue,
  expand: {
    questions,
    followup,
  },
})

export const mockAnswer = ({
  questionnaire,
  answers = {},
  date = '2026-07-07',
}: {
  questionnaire: string
  answers?: Record<string, unknown>
  date?: string
}): MockAnswer => ({
  id: `${questionnaire}-${date}`,
  user: 'test-user',
  questionnaire,
  answers,
  created: answerTimestamp,
  date,
})

export const seedAuthenticatedUser = async (page: Page) => {
  // Keep browser fixtures independent of any real PocketBase data or network.
  await page.route('**/api/**', route => route.fulfill({ status: 404, json: { message: 'Unmocked test API request' } }))
  await page.route('**/api/collections/users/records/test-user', route => route.fulfill({ json: {
    id: 'test-user', type: 'PRE', diagnosis: 'corpus', treatmentStart: '2026-07-01', treatmentEnd: '',
  } }))
  await page.route('**/api/collections/studySettings/records**', route => route.fulfill({ json: {
    page: 1, perPage: 1, totalItems: 1, totalPages: 1, items: [{ id: 'settings', key: 'default',
      baselineQuestionnaire: 'baseline-form', dailyQuestionnaire: 'daily-form',
      treatmentEndQuestionnaire: 'treatment-end-form', treatmentEndQuestion: 'treatment-end-date',
      aboutCollection: 'about', afterTreatmentCollection: 'after-treatment',
    }],
  } }))
  await page.route('**/api/collections/resourceAsset/records**', route => route.fulfill({ json: { page: 1, totalItems: 0, totalPages: 0, items: [] } }))
  await page.route('**/api/collections/resourceCollection/records**', route => route.fulfill({ json: { page: 1, totalItems: 0, totalPages: 0, items: [] } }))
  await page.route('**/daily-schedule', route => route.fulfill({ json: { startDate: null, endDate: null } }))
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'auth',
      JSON.stringify({
        token: 'test-token',
        model: {
          id: 'test-user',
          type: 'test',
          phoneNumber: '+46700000000',
        },
      })
    )
  })
}

export const seedQuestionnaireDraft = async (
  page: Page,
  key: string,
  answers: Record<string, unknown>,
  pageIndex = Object.keys(answers).length
) => {
  await page.addInitScript(
    ({ storageKey, storageAnswers, pageIndex }) => {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers: storageAnswers, page: pageIndex }))
    },
    {
      storageKey: `questionnaire-draft:v2:test-user:${key}`,
      pageIndex,
      storageAnswers: answers,
    }
  )
}

export const routeMockQuestionnaireApi = async (
  page: Page,
  questionnaire: MockQuestionnaire,
  options: MockApiOptions = {}
) => {
  const capture: { submittedAnswer?: SubmittedAnswer } = {}
  const { existingAnswers = [], submitStatus = 200 } = options

  await page.route('**/api/collections/questionnaires/records/**', (route) => {
    if (route.request().method() !== 'GET') {
      return route.fallback()
    }

    return route.fulfill({
      status: 200,
      json: questionnaire,
    })
  })

  await page.route('**/api/collections/answers/records**', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        json: {
          page: 0,
          perPage: 100,
          totalItems: existingAnswers.length,
          totalPages: existingAnswers.length > 0 ? 1 : 0,
          items: existingAnswers,
        },
      })
    }

    if (method === 'POST') {
      capture.submittedAnswer = route.request().postDataJSON()

      if (submitStatus >= 400) {
        return route.fulfill({
          status: submitStatus,
          json: {
            code: submitStatus,
            message: 'Mocked submit failure',
          },
        })
      }

      return route.fulfill({
        status: 200,
        json: {
          id: 'mock-answer',
          collectionName: 'answers',
          created: answerTimestamp,
          updated: answerTimestamp,
          ...capture.submittedAnswer,
        },
      })
    }

    return route.fallback()
  })

  return capture
}

export const openMockQuestionnaire = async (
  page: Page,
  questionnaire: MockQuestionnaire,
  date = '2026-07-07',
  options: MockApiOptions = {}
) => {
  await seedAuthenticatedUser(page)
  const capture = await routeMockQuestionnaireApi(page, questionnaire, options)

  await page.goto(`/forms/${questionnaire.id}?date=${date}`)
  await page.getByRole('button', { name: 'Gå vidare' }).click()

  return capture
}
