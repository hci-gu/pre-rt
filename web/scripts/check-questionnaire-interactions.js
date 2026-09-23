// Playwright CLI browser check; all API data is synthetic and writes are mocked.
async (page) => {
  await page.addInitScript(() => {
    localStorage.clear()
    document.cookie = 'auth=; Max-Age=0; path=/'
    localStorage.setItem('auth', JSON.stringify({ token: 'layout-test', model: { id: 'layout-user', type: 'PRE' } }))
  })
  await page.unrouteAll({ behavior: 'wait' })
  const options = ['Använt {AMOUNT}', ...Array.from({ length: 11 }, (_, i) => `Alternativ ${i + 2} med en längre förklaring för att pröva scrollning.`)]
  const source = {
    id: 'interaction-layout', name: 'Lång introduktion', description: '<p>Introduktion som ska vara läsbar.</p>'.repeat(30), occurrence: 'once', dependency: [],
    expand: { questions: [
      { id: 'multiple', type: 'multipleChoice', text: '<p>Välj ett eller flera alternativ.</p>', required: true, followup: [], expand: {
        options: { value: options, followup: [] },
        resource: { id: 'help', title: 'En längre hjälprubrik som också måste rymmas på en liten skärm', description: '<p>Hjälpinformation.</p>'.repeat(40) },
      } },
      { id: 'single', type: 'singleChoice', text: '<p>En fråga med nio alternativ.</p>', required: true, followup: [], expand: { options: { value: Array.from({ length: 9 }, (_, i) => `Val ${i + 1}`), followup: [] } } },
      { id: 'date', type: 'date', text: '<p>Välj datum.</p>', required: true, followup: [] },
    ] },
  }
  let submitted
  await page.route('**/api/**', route => {
    const path = route.request().url()
    if (path.includes('/questionnaires/records/')) return route.fulfill({ json: source })
    if (path.includes('/users/records/')) return route.fulfill({ json: { id: 'layout-user', type: 'PRE' } })
    if (path.includes('/answers/records') && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON()
      return route.fulfill({ json: { id: 'mock-answer', ...submitted } })
    }
    return route.fulfill({ json: { page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] } })
  })
  const assert = (value, message) => { if (!value) throw Error(message) }
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const frameFits = async () => {
    await page.getByTestId('question-scroll').waitFor()
    await settle()
    const result = await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="question-scroll"]')
      const r = scroll.getBoundingClientRect()
      const h = document.querySelector('.questionnaire-header').getBoundingClientRect()
      const f = document.querySelector('.questionnaire-footer').getBoundingClientRect()
      return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= h.bottom - 1 && r.bottom <= f.top + 1 && r.height > 0 && scroll.scrollWidth <= scroll.clientWidth + 1
    })
    assert(result, 'Question frame overlaps controls or viewport edges')
  }
  await page.setViewportSize({ width: 320, height: 480 })
  await page.goto('http://127.0.0.1:4173/forms/interaction-layout')
  await frameFits()
  await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
  await frameFits()
  const scroll = page.getByTestId('question-scroll')
  // Native touch input must scroll content, not navigate to the next question.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const box = await scroll.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height - 15
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 25 }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForFunction(() => document.querySelector('[data-testid="question-scroll"]').scrollTop > 0)
  assert(await page.getByTestId('questionnaire-pages').getAttribute('data-current-page') === '0', 'Touch scrolling changed the question')
  await page.locator('label[for="multiple-option-11"]').click()
  await page.locator('label[for="multiple-option-0"]').click()
  await page.getByPlaceholder('0', { exact: true }).fill('3')
  // Reproduce the available height after an on-screen keyboard opens.
  await page.setViewportSize({ width: 320, height: 240 })
  await settle()
  await frameFits()
  const input = await page.getByPlaceholder('0', { exact: true }).boundingBox()
  assert(input.y >= 0 && input.y + input.height <= 240, 'Focused number input is hidden after viewport shrink')
  await page.getByPlaceholder('0', { exact: true }).blur()
  await page.setViewportSize({ width: 667, height: 320 })
  await settle()
  await frameFits()
  await page.setViewportSize({ width: 320, height: 480 })
  await page.getByRole('button', { name: /Visa hjälp:/ }).click()
  const dialog = page.getByRole('dialog')
  const helpBounds = await dialog.boundingBox()
  assert(helpBounds.x >= 0 && helpBounds.y >= 0 && helpBounds.x + helpBounds.width <= 321 && helpBounds.y + helpBounds.height <= 481, 'Help exceeds the viewport')
  await page.getByRole('button', { name: 'Stäng hjälp' }).click()
  await page.getByRole('button', { name: 'Se alla frågor', exact: true }).click()
  await page.getByRole('button', { name: '2. En fråga med nio alternativ.' }).click()
  await page.locator('label[for="single-option-8"]').click()
  await page.getByRole('button', { name: 'Välj datum' }).waitFor()
  await page.getByTestId('questionnaire-previous').click()
  assert(await page.locator('#single-option-8').isChecked(), 'Single-choice answer was lost after unmount/remount')
  await page.getByTestId('questionnaire-previous').click()
  assert(await page.locator('#multiple-option-11').isChecked(), 'Multiple-choice answer was lost after unmount/remount')
  assert(await page.getByPlaceholder('0', { exact: true }).inputValue() === '3', 'Inline amount was lost after unmount/remount')
  await page.getByTestId('questionnaire-next').click()
  await page.getByTestId('questionnaire-next').click()
  await page.getByRole('button', { name: 'Välj datum' }).click()
  await page.getByRole('gridcell', { name: '15', exact: true }).click()
  await page.getByTestId('questionnaire-submit').click()
  await page.getByRole('heading', { name: 'Tack för ditt svar!' }).waitFor()
  await frameFits()
  assert(submitted.answers.multiple.includes('Använt {3}') && submitted.answers.multiple.includes(options[11]), 'Submitted multiple-choice/amount answers differ')
  assert(submitted.answers.single === 'Val 9', 'Submitted single-choice answer differs')
  await cdp.detach()
  return { passed: true, checks: ['long intro', 'native touch scroll', 'last option selection', 'inline number at end of label', 'keyboard-sized viewport', 'rotation', 'help dialog', 'question menu', 'retained answers', 'submission', 'success page'] }
}
