// Playwright CLI check; all questionnaire data and writes are mocked.
async (page) => {
  const source = {
    id: 'continue-fixture', name: 'Navigation', description: '<p>Introduktion</p>', occurrence: 'once', dependency: [],
    expand: { questions: [
      { id: 'multiple', type: 'multipleChoice', text: '<p>Välj flera alternativ.</p>', required: true, expand: { options: { value: Array.from({ length: 12 }, (_, i) => `Alternativ ${i + 1}`), followup: [] } } },
      { id: 'comment', type: 'text', text: '<p>En valfri kommentar.</p>', required: false },
      { id: 'age', type: 'number', text: '<p>Ålder</p>', placeholder: 'år', required: true },
      { id: 'amount', type: 'singleChoice', text: '<p>Ange ett antal.</p>', required: true, expand: { options: { value: ['Använt {AMOUNT} gånger', 'Inga'], followup: [] } } },
      { id: 'single', type: 'singleChoice', text: '<p>Välj ett alternativ.</p>', required: true, expand: { options: { value: ['Ja', 'Nej'], followup: [] } } },
      { id: 'date', type: 'date', text: '<p>Välj datum.</p>', required: true },
    ].map(question => ({ ...question, followup: [] })) },
  }
  let submissions = 0
  await page.unrouteAll({ behavior: 'wait' })
  await page.route('**/api/**', route => {
    const url = route.request().url()
    if (url.includes('/questionnaires/records/')) return route.fulfill({ json: source })
    if (url.includes('/users/records/')) return route.fulfill({ json: { id: 'layout-user', type: 'PRE' } })
    if (url.includes('/answers/records') && route.request().method() === 'POST') submissions++
    return route.fulfill({ json: { page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] } })
  })
  await page.addInitScript(() => {
    localStorage.clear()
    document.cookie = 'auth=; Max-Age=0; path=/'
    localStorage.setItem('auth', JSON.stringify({ token: 'layout-test', model: { id: 'layout-user', type: 'PRE' } }))
  })
  const assert = (condition, message) => { if (!condition) throw Error(message) }
  const continueButton = page.getByTestId('questionnaire-continue')
  const stayOn = async index => {
    // Auto-advance has a 400ms timer: wait past it to detect unintended navigation.
    await page.waitForTimeout(500)
    assert(await page.getByTestId('questionnaire-pages').getAttribute('data-current-page') === String(index), 'Manual answer advanced automatically')
  }
  const advance = async () => {
    assert(await continueButton.isEnabled(), 'Continue unexpectedly disabled')
    assert(await continueButton.isDisabled() === await page.getByTestId('questionnaire-next').isDisabled(), 'Continue and footer navigation disagree')
    await continueButton.scrollIntoViewIfNeeded()
    const reachable = await continueButton.evaluate(button => {
      const r = button.getBoundingClientRect()
      const panel = document.querySelector('.question-scroll').getBoundingClientRect()
      return r.height >= 44 && r.top >= panel.top - 1 && r.bottom <= panel.bottom + 1 && button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))
    })
    assert(reachable, 'Continue is clipped or covered')
    const separate = await continueButton.evaluate(button => {
      const card = document.querySelector('.question-card')
      return !card.contains(button) && button.getBoundingClientRect().top >= card.getBoundingClientRect().bottom + 8 &&
        getComputedStyle(card).backgroundColor === 'rgb(255, 255, 255)' &&
        getComputedStyle(document.querySelector('.question-scroll')).backgroundColor === 'rgba(0, 0, 0, 0)'
    })
    assert(separate, 'Continue must sit below the white answer card on the page background')
    await continueButton.click()
  }
  const results = []
  for (const viewport of [{ width: 320, height: 480 }, { width: 320, height: 240 }, { width: 667, height: 320 }, { width: 320, height: 568, largeText: true }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('http://127.0.0.1:4173/forms/continue-fixture')
    if (viewport.largeText) await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
    assert(await continueButton.isDisabled(), 'Unanswered multiple choice should match disabled footer navigation')
    await page.locator('label[for="multiple-option-11"]').click()
    await stayOn(0)
    await advance()
    assert(await continueButton.isEnabled(), 'Optional comment must be skippable')
    await page.getByPlaceholder('Valfri kommentar', { exact: true }).fill('Min kommentar')
    await stayOn(1)
    await advance()
    assert(await continueButton.isDisabled(), 'Unanswered number should match disabled footer navigation')
    await page.getByPlaceholder('år', { exact: true }).fill('45')
    await stayOn(2)
    await advance()
    await page.locator('label[for="amount-option-0"]').click()
    await page.getByPlaceholder('0', { exact: true }).fill('3')
    await stayOn(3)
    await advance()
    assert(await continueButton.count() === 0, 'Ordinary single choice should still auto-advance')
    await page.locator('label[for="single-option-0"]').click()
    await page.getByRole('button', { name: 'Välj datum', exact: true }).waitFor()
    assert(await continueButton.count() === 0, 'Date should still auto-advance')
    await page.getByRole('button', { name: 'Välj datum', exact: true }).click()
    await page.getByRole('gridcell', { name: '15', exact: true }).click()
    await page.getByTestId('questionnaire-submit').waitFor()
    assert(submissions === 0, 'Continue submitted the form')
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('continue-fixture')))
    assert(draft.multiple.includes('Alternativ 12') && draft.comment === 'Min kommentar' && draft.age === '45' && draft.amount === 'Använt {3} gånger', 'Manual answers were not retained')
    results.push(viewport)
  }
  return { passed: true, viewports: results, checks: ['multiple choice', 'optional text', 'number', 'typed amount', 'disabled state', 'button reachability', 'outside white card', 'existing auto-advance', 'no accidental submission', 'saved answers'] }
}
