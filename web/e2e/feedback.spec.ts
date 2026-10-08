import { expect, test, type Page } from '@playwright/test'
import { mockAnswer, mockQuestion, mockQuestionnaire, routeMockQuestionnaireApi, seedAuthenticatedUser, seedQuestionnaireDraft } from './fixtures/questionnaires'

const list = (items: unknown[]) => ({ page: 1, perPage: 100, totalPages: items.length ? 1 : 0, totalItems: items.length, items })

async function resources(page: Page) {
  await seedAuthenticatedUser(page)
  const paragraph = (text: string) => ({ type: 'paragraph', inline: [{ text }] })
  const collection = (id: string, name: string, quickExit = false) => {
    const resources = Array.from({ length: 16 }, (_, i) => ({
      id: `${id}-${i}`, sourceKey: `${id}.answer-${i}`, title: `${name} svar ${i}`,
      content: { schemaVersion: 1, audience: {}, blocks: [
        ...Array.from({ length: 9 }, (_, j) => paragraph(`Stycke ${j}. Här finns information som ska kunna läsas och nås utan att sidans kontroller täcker texten.`)),
        { type: 'paragraph', inline: [{ text: 'Öppna relaterat svar', target: 'related' }] },
      ] },
      bindings: { links: { related: id === 'violence' ? '/faq/other#other.answer-12' : '/faq/violence#violence.answer-12' } },
    }))
    return { id, name, showQuickExit: quickExit, resources: resources.map(r => r.id), expand: { resources } }
  }
  const collections = [collection('violence', 'Frågor om våld', true), collection('other', 'Annan kategori'), collection('after-treatment', 'Efter strålbehandlingen')]
  await page.route('**/api/collections/resourceCollection/records/**', route => {
    const id = new URL(route.request().url()).pathname.split('/').pop()
    return route.fulfill({ json: collections.find(c => c.id === id) })
  })
  await page.route('**/api/collections/answers/records**', route => route.fulfill({ json: list([]) }))
  await page.route('**/test-login', route => route.fulfill({ json: { enabled: false } }))
}

async function expectAnchorBelowHeader(page: Page, anchor: string) {
  await expect.poll(() => page.locator(`[id="${anchor}"]`).evaluate(el => {
    const header = document.querySelector('header')!
    const coveredTop = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0
    const rect = el.getBoundingClientRect()
    return rect.top >= coveredTop - 1 && rect.top < coveredTop + 90
  })).toBe(true)
}

test('violence FAQ deep links expose quick exit and preserve context through Back', async ({ page }) => {
  await resources(page)
  await page.goto('/faq/violence#violence.answer-12')
  await expect(page.getByRole('button', { name: 'Lämna genast' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Frågor om våld')
  await expect(page.getByRole('button', { name: 'Frågor om våld svar 12' })).toHaveAttribute('aria-expanded', 'true')
  await expectAnchorBelowHeader(page, 'violence.answer-12')
  const link = page.getByRole('link', { name: 'Öppna relaterat svar' })
  await link.scrollIntoViewIfNeeded()
  const originalScroll = await page.evaluate(() => window.scrollY)
  await link.click()
  await expect(page.getByRole('button', { name: 'Annan kategori svar 12' })).toHaveAttribute('aria-expanded', 'true')
  await expectAnchorBelowHeader(page, 'other.answer-12')
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Frågor om våld svar 12' })).toHaveAttribute('aria-expanded', 'true')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(originalScroll, -1)
  await expect(page.getByRole('button', { name: 'Lämna genast' })).toBeVisible()
})

test('opening and closing a low FAQ answer does not jump to its heading', async ({ page }) => {
  await resources(page)
  await page.goto('/faq/other')
  const answer = page.getByRole('button', { name: 'Annan kategori svar 12' })
  await answer.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.scrollY)
  await answer.click()
  await expect(answer).toHaveAttribute('aria-expanded', 'true')
  // Allow the former delayed smooth-scroll path to run before checking position.
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, -1)
  await answer.click()
  await expect(answer).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, -1)
})

test('after-treatment title and end-date controls remain inside their cards at 200% text', async ({ page }) => {
  await resources(page)
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  const card = page.getByRole('link', { name: 'Efter strålbehandlingen', exact: true })
  await expect(card).toBeVisible()
  const contained = () => card.evaluate(el => {
    const parent = el.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(el.querySelector('h2')!)
    return Array.from(range.getClientRects()).every(r => r.left >= parent.left && r.right <= parent.right && r.bottom <= parent.bottom)
  })
  expect(await contained()).toBe(true)
  await card.click()
  await expect(page).toHaveURL(/after-treatment$/)
  await expect(page.getByRole('heading', { name: 'Efter strålbehandlingen', level: 1, exact: true })).toBeVisible()
  expect(await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })))).toEqual([])
  await page.goto('/check-in')
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  const endCard = page.getByRole('link', { name: /Slutdatum strålbehandling/ })
  expect(await endCard.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('treatment end can be saved, edited, reloaded and retried after failure', async ({ page }) => {
  await seedAuthenticatedUser(page)
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00Z'))
  const form = mockQuestionnaire({ id: 'treatment-end-form', name: 'Slutdatum strålbehandling', questions: [mockQuestion({ id: 'treatment-end-date', text: 'Datum', type: 'date' })] })
  await routeMockQuestionnaireApi(page, form)
  let date = ''
  let fail = false
  let writes = 0
  await page.route('**/api/collections/users/records/test-user', route => route.fulfill({ json: { id: 'test-user', type: 'PRE', treatmentStart: '2026-09-01', treatmentEnd: date } }))
  await page.route('**/api/collections/answers/records**', route => route.fulfill({ json: list(date ? [mockAnswer({ questionnaire: form.id, answers: { 'treatment-end-date': date } })] : []) }))
  await page.route('**/treatment-end', route => {
    writes++
    if (fail) return route.fulfill({ status: 500, json: { message: 'Datumet kunde inte sparas. Försök igen.' } })
    expect(route.request().method()).toBe('PUT')
    date = route.request().postDataJSON().date
    return route.fulfill({ json: { treatmentEnd: date, answerId: 'same-answer' } })
  })
  await page.goto('/check-in')
  await page.getByRole('link', { name: /Slutdatum strålbehandling/ }).click()
  await page.getByRole('button', { name: 'Välj datum' }).click()
  await page.getByRole('gridcell', { name: '7', exact: true }).click()
  await page.getByRole('button', { name: 'Spara datum' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Dagligt formulär', exact: true }).click()
  await expect(page.getByRole('link', { name: /Slutdatum strålbehandling/ })).toContainText('2026-10-07')
  await page.getByRole('link', { name: /Ändra datum/ }).click()
  await page.getByRole('button', { name: '7 oktober 2026' }).click()
  await page.getByRole('gridcell', { name: '9', exact: true }).click()
  fail = true
  await page.getByRole('button', { name: 'Spara datum' }).click()
  await expect(page.getByRole('alert')).toContainText('Försök igen')
  expect(date).toBe('2026-10-07')
  fail = false
  await page.getByRole('button', { name: 'Spara datum' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Dagligt formulär', exact: true }).click()
  await expect(page.getByRole('link', { name: /Slutdatum strålbehandling/ })).toContainText('2026-10-09')
  await page.reload()
  await expect(page.getByRole('link', { name: /Slutdatum strålbehandling/ })).toContainText('2026-10-09')
  expect(writes).toBe(3)
})


test('question menu opens at the current question and keeps answer indicators up to date', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const form = mockQuestionnaire({ id: 'long-form', name: 'Långt formulär', questions:
    Array.from({ length: 57 }, (_, i) => mockQuestion({ id: `q${i}`, text: `Testfråga ${i + 1}`, type: 'number', required: false })),
  })
  await routeMockQuestionnaireApi(page, form)
  await seedQuestionnaireDraft(page, form.id, { q0: 0, q1: '  ', q2: '-1', q33: '7' }, 33)
  await page.goto('/forms/long-form')
  await expect(page.getByText('Testfråga 34', { exact: true })).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Se alla frågor', exact: true })
  const menu = page.getByRole('dialog')
  const current = menu.getByRole('button', { name: '34. Testfråga 34', exact: true })
  const expectPosition = async () => {
    await expect(current).toBeFocused()
    await expect(current).toHaveAttribute('aria-current', 'step')
    await expect.poll(() => current.evaluate(el => {
      const viewport = el.closest('.questionnaire-dialog-scroll')!.getBoundingClientRect()
      const row = el.getBoundingClientRect()
      return Math.abs((row.top + row.bottom) / 2 - (viewport.top + viewport.bottom) / 2)
    })).toBeLessThan(8)
    await expect(page.getByRole('button', { name: 'Stäng frågor', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  }
  await trigger.click()
  await expectPosition()
  await expect(current).toHaveAccessibleDescription('Besvarad')
  await test.info().attach('question-menu', { body: await menu.screenshot(), contentType: 'image/png' })
  await expect(menu.getByRole('button', { name: '1. Testfråga 1', exact: true })).toHaveAccessibleDescription('Besvarad')
  for (const number of [2, 3, 35]) {
    await expect(menu.getByRole('button', { name: `${number}. Testfråga ${number}`, exact: true })).toHaveAccessibleDescription('Obesvarad')
  }
  // Reopening must restore the current question even after browsing the list.
  await menu.locator('.questionnaire-dialog-scroll').evaluate(el => { el.scrollTop = 0 })
  await page.getByRole('button', { name: 'Stäng frågor', exact: true }).click()
  await trigger.click()
  await expectPosition()
  await page.getByRole('button', { name: 'Stäng frågor', exact: true }).click()
  await page.getByRole('spinbutton').fill('')
  await trigger.click()
  await expect(current).toHaveAccessibleDescription('Obesvarad')
  await current.click()
  await expect(menu).not.toBeVisible()
  await page.getByRole('spinbutton').fill('0')
  await trigger.click()
  await expectPosition()
  await expect(current).toHaveAccessibleDescription('Besvarad')
})

test('question menu quick exit follows the current violence section', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const form = mockQuestionnaire({ id: 'baseline', name: 'Inledande formulär', questions: [
    mockQuestion({ id: 'age', text: 'Ålder', type: 'number' }),
    mockQuestion({ id: 'kujwudwaahabsiz', text: 'Frågor om våld', type: 'section' }),
    mockQuestion({ id: 'violence', text: 'Våldsfråga', type: 'singleChoice', options: ['Ja', 'Nej'] }),
    mockQuestion({ id: 'other-section', text: 'Övriga frågor', type: 'section' }),
    mockQuestion({ id: 'other', text: 'Övrig kommentar', type: 'text' }),
  ] })
  await routeMockQuestionnaireApi(page, form)
  await seedQuestionnaireDraft(page, form.id, {}, 0)
  await page.goto('/forms/baseline')
  await expect(page.getByText('Ålder', { exact: true })).toBeVisible()
  const quickExit = page.getByRole('button', { name: 'Lämna genast', exact: true })
  await expect(quickExit).toHaveCount(0)
  await page.getByRole('button', { name: 'Se alla frågor' }).click()
  const menu = page.getByRole('dialog')
  const menuExit = menu.getByRole('button', { name: 'Lämna genast', exact: true })
  await expect(menuExit).toHaveCount(0)
  await menu.getByRole('button', { name: /Våldsfråga/ }).click()
  await expect(quickExit).toBeVisible()
  await page.getByRole('button', { name: 'Se alla frågor' }).click()
  await expect(menuExit).toBeVisible()
  await menu.getByRole('button', { name: /Övrig kommentar/ }).click()
  await expect(menu).not.toBeVisible()
  await expect(page.getByText('Övrig kommentar', { exact: true })).toBeVisible()
  await expect(quickExit).toHaveCount(0)
  await page.getByRole('button', { name: 'Se alla frågor' }).click()
  await expect(menuExit).toHaveCount(0)
})

test('PCL closing help, question menu and submission retain quick exit and clear the parent draft', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const close = mockQuestion({ id: 'closing', text: 'Tack för att du svarat på PCL-5', type: 'section' })
  close.expand = { resource: { id: 'support', title: 'Stöd och hjälp', description: '<p>Stödets sista stycke.</p>' } }
  const form = mockQuestionnaire({ id: 'baseline', name: 'Inledande formulär', questions: [mockQuestion({ id: 'gate', text: 'Våldsfråga', type: 'singleChoice', options: ['Ja', 'Nej'] })], followup: [mockQuestionnaire({
    id: 'pcl', name: 'PCL-5', dependency: ['gate'], dependencyValue: 'Ja', questions: [
      mockQuestion({ id: 'yk0osj2389ut13y', text: 'PCL-5 introduktion', type: 'section' }),
      mockQuestion({ id: 'symptom', text: 'Symtomfråga', type: 'singleChoice', options: ['Inte alls', 'Måttligt'] }), close,
    ],
  })] })
  await routeMockQuestionnaireApi(page, form)
  await seedQuestionnaireDraft(page, form.id, { gate: 'Ja' }, 2)
  await page.goto('/forms/baseline')
  await expect(page.getByText('Symtomfråga', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lämna genast', exact: true })).toBeVisible()
  await page.getByText('Måttligt', { exact: true }).click()
  await expect(page.getByText('Tack för att du svarat på PCL-5')).toBeVisible()
  await page.getByRole('button', { name: 'Visa hjälp: Stöd och hjälp' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Lämna genast' })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Stödets sista stycke.')
  await page.getByRole('button', { name: 'Stäng hjälp' }).click()
  await page.getByTestId('questionnaire-next').click()
  await expect(page.getByTestId('questionnaire-submit')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lämna genast', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Se alla frågor' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Lämna genast' })).toBeVisible()
  await page.getByRole('button', { name: 'Stäng frågor' }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('questionnaire-draft:v2:test-user:baseline')!).answers)).toMatchObject({ gate: 'Ja', followup_pcl_symptom: 'Måttligt' })
  // Intercept the external exit and inspect the original origin through the
  // browser context. No request reaches an external service.
  await page.route('https://www.google.se/**', route => route.abort())
  await page.getByRole('button', { name: 'Lämna genast', exact: true }).click()
  await expect.poll(async () => (await page.context().storageState()).origins.flatMap(origin => origin.localStorage).find(item => item.name === 'questionnaire-draft:v2:test-user:baseline')).toBeUndefined()
})

test('PCL answers and daily 10cm keep their stored values when submitted', async ({ page }) => {
  await seedAuthenticatedUser(page)
  const form = mockQuestionnaire({ id: 'baseline', name: 'Baseline', questions: [mockQuestion({ id: 'gate', text: 'Våldsfråga', type: 'singleChoice', options: ['Ja', 'Nej'] })], followup: [mockQuestionnaire({
    id: 'pcl', name: 'PCL-5', dependency: ['gate'], dependencyValue: 'Ja', questions: [
      mockQuestion({ id: 'yk0osj2389ut13y', text: 'PCL introduktion', type: 'section' }),
      mockQuestion({ id: 'symptom', text: 'Symtomfråga', type: 'singleChoice', options: ['Inte alls', 'Måttligt'] }),
    ],
  })] })
  const capture = await routeMockQuestionnaireApi(page, form)
  await seedQuestionnaireDraft(page, 'baseline', { gate: 'Ja', followup_pcl_symptom: 'Måttligt' }, 3)
  await page.goto('/forms/baseline')
  await page.getByTestId('questionnaire-submit').click()
  await expect.poll(() => capture.submittedAnswer?.answers).toEqual({ gate: 'Ja', followup_pcl_symptom: 'Måttligt' })
  const daily = mockQuestionnaire({ id: 'daily', name: 'Dagligt formulär', occurrence: 'daily', questions: [mockQuestion({ id: 'length', text: 'Längd', type: 'singleChoice', options: ['2cm', '4cm', '6cm', '8cm', '10cm'] })] })
  const dailyCapture = await routeMockQuestionnaireApi(page, daily)
  await page.goto('/forms/daily')
  await page.getByRole('button', { name: 'Gå vidare' }).click()
  await page.getByText('10cm', { exact: true }).click()
  await page.getByTestId('questionnaire-submit').click()
  await expect.poll(() => dailyCapture.submittedAnswer?.answers).toEqual({ length: '10cm' })
})
