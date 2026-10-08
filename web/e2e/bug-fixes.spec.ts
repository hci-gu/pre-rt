import { expect, test, type Page } from '@playwright/test'
import { mockQuestion, mockQuestionnaire, openMockQuestionnaire, routeMockQuestionnaireApi, seedAuthenticatedUser, seedQuestionnaireDraft } from './fixtures/questionnaires'

const key = (id: string, day?: string) => `questionnaire-draft:v2:test-user:${id}${day ? ':' + day : ''}`
const at = (page: Page, index: number) => expect(page.getByTestId('questionnaire-pages')).toHaveAttribute('data-current-page', String(index))
const list = (items: unknown[]) => ({ page: 1, totalPages: 1, totalItems: items.length, items })

test('changed No gates omit previously answered dilator and PCL values', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const form = mockQuestionnaire({ id: 'branch-cleanup', name: 'Branches', questions: [
    mockQuestion({ id: 'trial', text: 'Testat staven?', type: 'singleChoice', options: ['Ja', 'Nej'] }),
    mockQuestion({ id: 'size', text: 'Storlek', type: 'singleChoice', options: ['Mindre'], dependency: 'trial', dependencyValue: 'Ja' }),
    mockQuestion({ id: 'length', text: 'Längd', type: 'singleChoice', options: ['2cm'], dependency: 'trial', dependencyValue: 'Ja' }),
    mockQuestion({ id: 'violence', text: 'Våldsfråga', type: 'singleChoice', options: ['Ja', 'Nej'] }),
  ], followup: [mockQuestionnaire({ id: 'pcl', name: 'PCL-5', dependency: ['violence'], dependencyValue: 'Ja', questions: [mockQuestion({ id: 'symptom', text: 'Symtom', type: 'singleChoice', options: ['Måttligt'] })] })] })
  const capture = await routeMockQuestionnaireApi(page, form)
  await seedQuestionnaireDraft(page, form.id, { trial: 'Ja', size: 'Mindre', length: '2cm', violence: 'Ja', followup_pcl_symptom: 'Måttligt' }, 0)
  await page.goto(`/forms/${form.id}`)
  await page.getByText('Nej', { exact: true }).click(); await at(page, 1)
  await page.getByText('Nej', { exact: true }).click(); await at(page, 2)
  await page.getByTestId('questionnaire-submit').click()
  await expect.poll(() => capture.submittedAnswer?.answers).toEqual({ trial: 'Nej', violence: 'Nej' })
})

test('cleared typed amounts stay empty and invalid age blocks advancement while optional blanks can be skipped', async ({ page }) => {
  const form = mockQuestionnaire({ id: 'validation', name: 'Validation', questions: [
    mockQuestion({ id: 'smoking', text: 'Röker du?', type: 'singleChoice', required: false, options: ['Nej', 'Slutade vid {AMOUNT} års ålder'] }),
    mockQuestion({ id: 'age', text: 'Ålder', type: 'number', placeholder: 'år', required: false }),
  ] })
  await openMockQuestionnaire(page, form)
  await page.locator('label[for="smoking-option-1"]').click()
  await page.getByRole('spinbutton').fill('18')
  await page.getByRole('spinbutton').fill('')
  await expect(page.getByTestId('questionnaire-continue')).toBeDisabled()
  await page.reload(); await at(page, 0)
  await expect(page.getByRole('spinbutton')).toHaveValue('')
  await page.getByText('Nej', { exact: true }).click(); await at(page, 1)
  await page.getByRole('spinbutton').fill('-12')
  await expect(page.getByRole('alert')).toContainText('0 eller större')
  await expect(page.getByTestId('questionnaire-continue')).toBeDisabled()
  await page.getByRole('spinbutton').fill('')
  await expect(page.getByTestId('questionnaire-continue')).toBeEnabled()
  await page.getByTestId('questionnaire-continue').click(); await at(page, 2)
  await page.getByTestId('questionnaire-submit').click()
  await expect(page.getByRole('heading', { name: 'Tack för ditt svar!' })).toBeVisible()
})

test('daily drafts survive reload and remain separate for selected historical dates', async ({ page }) => {
  const form = mockQuestionnaire({ id: 'daily-drafts', name: 'Daily', occurrence: 'daily', questions: [
    mockQuestion({ id: 'number', text: 'Antal', type: 'number' }), mockQuestion({ id: 'pain', text: 'Smärta', type: 'painScale' }),
  ] })
  await openMockQuestionnaire(page, form, '2026-07-06')
  await page.getByRole('spinbutton').fill('42'); await page.getByTestId('questionnaire-continue').click(); await at(page, 1)
  await page.reload(); await at(page, 1)
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).answers.number, key(form.id, '2026-07-06'))).toBe('42')
  await page.goto(`/forms/${form.id}?date=2026-07-07`)
  await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
  await expect(page.getByRole('spinbutton')).toHaveValue('')
  await page.goto(`/forms/${form.id}?date=2026-07-06`); await at(page, 1)
  await page.getByTestId('questionnaire-previous').click()
  await expect(page.getByRole('spinbutton')).toHaveValue('42')
})

test('logout clears drafts and the next participant receives an empty baseline', async ({ page }) => {
  const form = mockQuestionnaire({ id: 'baseline-form', name: 'Baseline', questions: [mockQuestion({ id: 'age', text: 'Ålder', type: 'number', required: false, placeholder: 'år' })] })
  await openMockQuestionnaire(page, form)
  await page.getByRole('spinbutton').fill('57')
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).answers.age, key(form.id))).toBe('57')
  await page.goto('/profile'); await page.getByRole('button', { name: 'Logga ut', exact: true }).click()
  await expect(page).toHaveURL(/welcome$/)
  expect(await page.evaluate(k => localStorage.getItem(k), key(form.id))).toBeNull()
  await page.route('**/otp-create', route => route.fulfill({ json: { id: 'challenge' } }))
  await page.route('**/otp-verify', route => route.fulfill({ json: { token: 'second-token', record: { id: 'second-user', type: 'PRE' } } }))
  await page.route('**/api/collections/users/records/second-user', route => route.fulfill({ json: { id: 'second-user', type: 'PRE', treatmentStart: '2026-07-01' } }))
  // Follow SPA navigation so the one-time auth fixture does not reseed the first user.
  await page.getByRole('link', { name: 'Logga in', exact: true }).click()
  await page.getByLabel('Telefonnummer', { exact: true }).fill('AUDIT-SECOND')
  await page.getByRole('button', { name: 'Skicka engångskod' }).click()
  await page.locator('input').fill('123456'); await page.getByRole('button', { name: 'Skicka in', exact: true }).click()
  await page.getByRole('link', { name: 'Inledande frågeformulär', exact: true }).click()
  await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
  await expect(page.getByRole('spinbutton')).toHaveValue('')
})

test('logout in another tab closes the open questionnaire and clears its draft', async ({ page }) => {
  const form = mockQuestionnaire({ id: 'baseline-form', name: 'Baseline', questions: [mockQuestion({ id: 'age', text: 'Ålder', type: 'number', required: false })] })
  await openMockQuestionnaire(page, form)
  await page.getByRole('spinbutton').fill('57')
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).answers.age, key(form.id))).toBe('57')
  const other = await page.context().newPage()
  await seedAuthenticatedUser(other)
  await routeMockQuestionnaireApi(other, form)
  await other.goto('/profile')
  await other.getByRole('button', { name: 'Logga ut', exact: true }).click()
  await expect(page).toHaveURL(/welcome$/)
  expect(await page.evaluate(k => localStorage.getItem(k), key(form.id))).toBeNull()
  await other.close()
})

test('profile is reachable and its treatment-end link leads to the real editor', async ({ page }) => {
  await seedAuthenticatedUser(page)
  await routeMockQuestionnaireApi(page, mockQuestionnaire({ id: 'treatment-end-form', name: 'Slutdatum', questions: [mockQuestion({ id: 'treatment-end-date', text: 'Datum', type: 'date' })] }))
  await page.goto('/')
  await page.getByRole('link', { name: 'Profil och logga ut' }).click()
  await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /juli/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ange slutdatum' }).click()
  await expect(page.getByRole('button', { name: 'Välj datum' })).toBeVisible()
})

test('login reports network and invalid-code failures, supports retry and requesting another code', async ({ page }) => {
  await page.route('**/test-login', route => route.fulfill({ status: 404, json: {} }))
  await page.route('**/otp-create', route => route.abort())
  await page.goto('/login'); await page.getByLabel('Telefonnummer', { exact: true }).fill('0700000000')
  await page.getByRole('button', { name: 'Skicka engångskod' }).click()
  await expect(page.getByRole('alert')).toContainText('internetanslutning')
  await page.route('**/otp-create', route => route.fulfill({ json: { id: 'challenge' } }))
  await page.route('**/otp-verify', route => route.fulfill({ status: 401, json: {} }))
  await page.getByRole('button', { name: 'Skicka engångskod' }).click()
  await page.locator('input').fill('123456'); await page.getByRole('button', { name: 'Skicka in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('felaktig eller har gått ut')
  await expect(page.getByRole('button', { name: 'Skicka in', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: 'Begär en ny kod' }).click()
  await expect(page.getByLabel('Telefonnummer', { exact: true })).toBeVisible()
})

test('one-time forms do not depend on the daily schedule endpoint', async ({ page }) => {
  await page.route('**/daily-schedule', route => route.abort())
  const form = mockQuestionnaire({ id: 'baseline-form', name: 'Baseline', questions: [mockQuestion({ id: 'age', text: 'Ålder', type: 'number' })] })
  await seedAuthenticatedUser(page)
  await routeMockQuestionnaireApi(page, form)
  await page.route('**/daily-schedule', route => route.abort())
  await page.goto('/forms/baseline-form')
  await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
  await expect(page.getByRole('spinbutton')).toBeVisible()
})

test('history excludes post-schedule days and uses separate non-overlapping controls at enlarged text', async ({ page }) => {
  await seedAuthenticatedUser(page)
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00Z'))
  const form = mockQuestionnaire({ id: 'daily-form', name: 'Dagligt formulär', occurrence: 'daily', questions: [mockQuestion({ id: 'daily-answer', text: 'Svar', type: 'number' })] })
  await routeMockQuestionnaireApi(page, form)
  await page.route('**/daily-schedule', route => route.fulfill({ json: { startDate: '2026-09-01', endDate: '2026-09-30' } }))
  await page.goto('/forms/daily-form/history')
  await expect(page.getByRole('heading', { name: 'oktober 2026' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Svara för/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Föregående månad' }).click()
  await expect(page.getByRole('link', { name: /^Svara för/ })).toHaveCount(30)
  await page.setViewportSize({ width: 320, height: 568 }); await page.addStyleTag({ content: 'html{font-size:200%}' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('.history-day').evaluateAll(days => days.every(day => {
    const r = day.getBoundingClientRect()
    return [...day.querySelectorAll('a,time')].every(el => { const c = el.getBoundingClientRect(); return c.left >= r.left && c.right <= r.right && c.bottom <= r.bottom })
  }))).toBe(true)
  await page.goto('/forms/daily-form?date=2026-10-01')
  await expect(page.getByRole('heading', { name: 'Datumet ligger utanför formulärperioden' })).toBeVisible()
})

test('missing forms, network failures and unknown routes have usable recovery pages', async ({ page }) => {
  await seedAuthenticatedUser(page)
  for (const path of ['/forms/nonexistent', '/not-a-real-page']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Sidan kunde inte hittas' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Till startsidan' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Unexpected Application Error')
  }
  await page.route('**/api/collections/questionnaires/records/failed**', route => route.abort())
  await page.goto('/forms/failed')
  await expect(page.getByRole('heading', { name: 'Det gick inte att öppna sidan' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Försök igen' })).toBeVisible()
})

test('date cards and FAQ actions fit desktop, laptop, mobile and enlarged small mobile', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const form = mockQuestionnaire({ id: 'baseline-form', name: 'Baseline', questions: [] })
  await routeMockQuestionnaireApi(page, form)
  const collection = { id: 'violence', name: 'Frågor om våld', showQuickExit: true, visible_on_questions_and_answers: true, expand: { resources: [] }, resources: [] }
  await page.route('**/api/collections/resourceCollection/records**', route => route.fulfill({ json: list([collection]) }))
  for (const view of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(view)
    await page.goto('/check-in'); await page.getByRole('link', { name: /Slutdatum strålbehandling/ }).waitFor()
    expect(await page.locator('article').evaluateAll(cards => cards.every(card => { const r = card.getBoundingClientRect(); return [...card.querySelectorAll('h2,span')].every(el => { const c = el.getBoundingClientRect(); return c.bottom <= r.bottom + 1 && c.right <= r.right + 1 }) }))).toBe(true)
    await page.goto('/faq/mer')
    if (view.width === 320) await page.addStyleTag({ content: 'html{font-size:200%}' })
    const back = page.getByRole('link', { name: 'Tillbaka till frågor och svar' }); await back.waitFor()
    for (const action of [back, page.getByRole('button', { name: 'Lämna genast' })]) {
      await action.scrollIntoViewIfNeeded()
      expect(await action.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })).toBe(true)
    }
  }
})

test('login actions remain reachable on short screens with and without the test panel', async ({ page }) => {
  for (const enabled of [true, false]) {
    await page.route('**/test-login', route => route.fulfill({ status: enabled ? 200 : 404, json: {} }))
    for (const view of [{ width: 320, height: 568 }, { width: 390, height: 420 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(view); await page.goto('/login')
      const action = page.getByRole('button', { name: enabled ? 'Prova med testkonto' : 'Skicka engångskod' })
      await action.scrollIntoViewIfNeeded()
      expect(await action.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === hit || el.contains(hit) })).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})
