import { expect, test } from '@playwright/test'
import {
  mockAnswer,
  mockQuestion,
  mockQuestionnaire,
  openMockQuestionnaire,
  routeMockQuestionnaireApi,
  seedAuthenticatedUser,
  seedQuestionnaireDraft,
} from './fixtures/questionnaires'

const expectPage = async (page: import('@playwright/test').Page, pageIndex: number) => {
  await expect(page.getByTestId('questionnaire-pages')).toHaveAttribute(
    'data-current-page',
    String(pageIndex)
  )
}

const expectProgress = async (
  page: import('@playwright/test').Page,
  progress: string
) => {
  await expect(page.getByTestId('questionnaire-progress')).toHaveText(progress)
}

test.describe('questionnaire form', () => {
  test('answers every question type and submits the constructed answer object', async ({
    page,
  }) => {
    const questionnaire = mockQuestionnaire({
      id: 'all-types-questionnaire',
      name: 'All question types',
      questions: [
        mockQuestion({
          id: 'q_text',
          text: 'Free text question',
          type: 'text',
          placeholder: 'Short answer',
        }),
        mockQuestion({
          id: 'q_section',
          text: 'Section information',
          type: 'section',
        }),
        mockQuestion({
          id: 'q_number',
          text: 'Number question',
          type: 'number',
          placeholder: '0 to 99',
        }),
        mockQuestion({
          id: 'q_pain',
          text: 'Pain scale question',
          type: 'painScale',
        }),
        mockQuestion({
          id: 'q_single',
          text: 'Single choice question',
          type: 'singleChoice',
          options: ['Alpha', 'Beta', 'Gamma'],
        }),
        mockQuestion({
          id: 'q_multi',
          text: 'Multiple choice question',
          type: 'multipleChoice',
          options: ['One', 'Two', 'Three'],
        }),
        mockQuestion({
          id: 'q_date',
          text: 'Date question',
          type: 'date',
        }),
      ],
    })

    const capture = await openMockQuestionnaire(page, questionnaire)

    await expectPage(page, 0)
    await expectProgress(page, '1/5')
    await page.getByPlaceholder('Short answer').fill('Free text answer')
    await page.getByTestId('questionnaire-next').click()

    await expectPage(page, 1)
    await page
      .getByTestId('questionnaire-pages')
      .getByRole('button', { name: 'Gå vidare' })
      .click()

    await expectPage(page, 2)
    await page.getByPlaceholder('0 to 99').fill('42')
    await page.getByTestId('questionnaire-next').click()

    await expectPage(page, 3)
    await expectProgress(page, '2/5')
    await page.locator('label[for="q_pain_pain_7"]').click()

    await expectPage(page, 4)
    await expectProgress(page, '3/5')
    await page.getByText('Beta', { exact: true }).click()

    await expectPage(page, 5)
    await expectProgress(page, '4/5')
    await page.getByText('One', { exact: true }).click()
    await page.getByText('Three', { exact: true }).click()
    await page.getByTestId('questionnaire-next').click()

    await expectPage(page, 6)
    await expectProgress(page, '5/5')
    await page.getByRole('button', { name: 'Välj datum' }).click()
    await page.getByRole('gridcell', { name: '15' }).click()

    await expectPage(page, 7)
    await page.getByTestId('questionnaire-submit').click()

    await expect(page.getByRole('heading', { name: 'Tack för ditt svar!' })).toBeVisible()
    await expect.poll(() => capture.submittedAnswer).toBeTruthy()

    expect(capture.submittedAnswer).toMatchObject({
      user: 'test-user',
      questionnaire: 'all-types-questionnaire',
      answers: {
        q_text: 'Free text answer',
        q_number: '42',
        q_pain: '7',
        q_single: 'Beta',
        q_multi: ['One', 'Three'],
      },
    })
    expect(capture.submittedAnswer?.date).toContain('2026-07-07')

    const submittedDate = new Date(
      String(capture.submittedAnswer?.answers?.q_date)
    )
    expect(Number.isNaN(submittedDate.getTime())).toBe(false)
    expect(submittedDate.getUTCDate()).toBe(15)
  })

  test('shows progress through a regular questionnaire', async ({ page }) => {
    const questionnaire = mockQuestionnaire({
      id: 'regular-progress-questionnaire',
      name: 'Regular progress',
      questions: [
        mockQuestion({
          id: 'regular_one',
          text: 'Regular first question',
          type: 'singleChoice',
          options: ['First answer', 'Other'],
        }),
        mockQuestion({
          id: 'regular_two',
          text: 'Regular second question',
          type: 'singleChoice',
          options: ['Second answer', 'Other'],
        }),
        mockQuestion({
          id: 'regular_three',
          text: 'Regular third question',
          type: 'singleChoice',
          options: ['Third answer', 'Other'],
        }),
      ],
    })

    await openMockQuestionnaire(page, questionnaire)

    await expectPage(page, 0)
    await expectProgress(page, '1/3')

    await page.getByText('First answer', { exact: true }).click()
    await expectPage(page, 1)
    await expectProgress(page, '2/3')

    await page.getByText('Second answer', { exact: true }).click()
    await expectPage(page, 2)
    await expectProgress(page, '3/3')
  })

  test('updates progress when a gated answer reveals a follow-up question', async ({
    page,
  }) => {
    const questionnaire = mockQuestionnaire({
      id: 'gated-progress-questionnaire',
      name: 'Gated progress',
      questions: [
        mockQuestion({
          id: 'gate',
          text: 'Should a follow-up be shown?',
          type: 'singleChoice',
          options: ['Yes', 'No'],
          dependencyValue: 'Yes',
          followup: ['gate_followup'],
        }),
        mockQuestion({
          id: 'gate_followup',
          text: 'Follow-up pain scale',
          type: 'painScale',
        }),
        mockQuestion({
          id: 'after_gate',
          text: 'Question after gate',
          type: 'singleChoice',
          options: ['Continue', 'Stop'],
        }),
      ],
    })

    await openMockQuestionnaire(page, questionnaire)

    await expectPage(page, 0)
    await expectProgress(page, '1/2')

    await page.getByText('Yes', { exact: true }).click()
    await expectPage(page, 1)
    await expect(page.getByTestId('questionnaire-pages')).toHaveAttribute(
      'data-question-count',
      '3'
    )
    await expectProgress(page, '2/3')

    await page.locator('label[for="gate_gate_followup_pain_5"]').click()
    await expectPage(page, 2)
    await expectProgress(page, '3/3')
  })

  test('resumes a cached draft and clears it after successful submit', async ({
    page,
  }) => {
    const questionnaire = mockQuestionnaire({
      id: 'cached-draft-questionnaire',
      name: 'Cached draft',
      questions: [
        mockQuestion({
          id: 'draft_first',
          text: 'Cached first question',
          type: 'singleChoice',
          options: ['Already answered', 'Other'],
        }),
        mockQuestion({
          id: 'draft_second',
          text: 'Remaining question',
          type: 'painScale',
        }),
      ],
    })

    await seedAuthenticatedUser(page)
    await seedQuestionnaireDraft(page, questionnaire.id, {
      draft_first: 'Already answered',
    })
    const capture = await routeMockQuestionnaireApi(page, questionnaire)

    await page.goto(`/forms/${questionnaire.id}?date=2026-07-07`)
    await expectPage(page, 1)
    await expectProgress(page, '2/2')

    await page.locator('label[for="draft_second_pain_6"]').click()
    await expectPage(page, 2)
    await page.getByTestId('questionnaire-submit').click()

    await expect(page.getByRole('heading', { name: 'Tack för ditt svar!' })).toBeVisible()
    await expect.poll(() => capture.submittedAnswer).toBeTruthy()
    expect(capture.submittedAnswer?.answers).toMatchObject({
      draft_first: 'Already answered',
      draft_second: '6',
    })
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(`questionnaire-draft:v2:test-user:${key}`), questionnaire.id))
      .toBeNull()
  })

  test('shows an error and keeps answers when submission fails', async ({ page }) => {
    const questionnaire = mockQuestionnaire({
      id: 'submit-failure-questionnaire',
      name: 'Submit failure',
      questions: [
        mockQuestion({
          id: 'failure_question',
          text: 'Question before failing submit',
          type: 'singleChoice',
          options: ['Answer', 'Other'],
        }),
      ],
    })

    await openMockQuestionnaire(page, questionnaire, '2026-07-07', {
      submitStatus: 500,
    })

    await page.getByText('Answer', { exact: true }).click()
    await expectPage(page, 1)
    await page.getByTestId('questionnaire-submit').click()

    await expect(
      page.getByText('Uh oh! Something went wrong.', { exact: true })
    ).toBeVisible()
    await expect(page.getByTestId('questionnaire-submit')).toBeEnabled()
    await expect(page).toHaveURL(/\/forms\/submit-failure-questionnaire/)
  })

  test('shows the already answered state on direct form load', async ({ page }) => {
    const questionnaire = mockQuestionnaire({
      id: 'already-answered-questionnaire',
      name: 'Already answered',
      questions: [
        mockQuestion({
          id: 'already_question',
          text: 'Already answered question',
          type: 'singleChoice',
          options: ['Answer', 'Other'],
        }),
      ],
    })

    await seedAuthenticatedUser(page)
    await routeMockQuestionnaireApi(page, questionnaire, {
      existingAnswers: [
        mockAnswer({
          questionnaire: questionnaire.id,
          answers: { already_question: 'Answer' },
        }),
      ],
    })

    await page.goto(`/forms/${questionnaire.id}?date=2026-07-07`)
    await expect(
      page.getByText('Du har redan svarat på det här formuläret.')
    ).toBeVisible()
  })

  test('submits choices with amount placeholders', async ({ page }) => {
    const questionnaire = mockQuestionnaire({
      id: 'amount-questionnaire',
      name: 'Amount choices',
      questions: [
        mockQuestion({
          id: 'amount',
          text: 'How many times?',
          type: 'singleChoice',
          options: ['I used {AMOUNT} times', 'None'],
        }),
      ],
    })

    const capture = await openMockQuestionnaire(page, questionnaire)

    await page.locator('label[for="amount-option-0"]').click()
    await page.getByPlaceholder('0').fill('3')
    await page.getByTestId('questionnaire-next').click()
    await page.getByTestId('questionnaire-submit').click()

    await expect(page.getByRole('heading', { name: 'Tack för ditt svar!' })).toBeVisible()
    await expect.poll(() => capture.submittedAnswer).toBeTruthy()
    expect(capture.submittedAnswer?.answers).toMatchObject({
      amount: 'I used {3} times',
    })
  })

  test('appends a dependency-matched follow-up questionnaire', async ({ page }) => {
    const questionnaire = mockQuestionnaire({
      id: 'followup-questionnaire',
      name: 'Follow-up questionnaire',
      questions: [
        mockQuestion({
          id: 'followup_gate',
          text: 'Should the extra questionnaire be shown?',
          type: 'singleChoice',
          options: ['Yes', 'No'],
        }),
      ],
      followup: [
        mockQuestionnaire({
          id: 'extra',
          name: 'Extra',
          dependency: ['followup_gate'],
          dependencyValue: 'Yes',
          questions: [
            mockQuestion({
              id: 'extra_pain',
              text: 'Extra pain question',
              type: 'painScale',
            }),
          ],
        }),
      ],
    })

    const capture = await openMockQuestionnaire(page, questionnaire)

    await expectProgress(page, '1/1')
    await page.getByText('Yes', { exact: true }).click()
    await expect(page.getByTestId('questionnaire-pages')).toHaveAttribute(
      'data-question-count',
      '2'
    )
    await expectProgress(page, '2/2')

    await page.locator('label[for="followup_extra_extra_pain_pain_4"]').click()
    await expectPage(page, 2)
    await page.getByTestId('questionnaire-submit').click()

    await expect(page.getByRole('heading', { name: 'Tack för ditt svar!' })).toBeVisible()
    await expect.poll(() => capture.submittedAnswer).toBeTruthy()
    expect(capture.submittedAnswer?.answers).toMatchObject({
      followup_gate: 'Yes',
      followup_extra_extra_pain: '4',
    })
  })
})
