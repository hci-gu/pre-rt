// Playwright CLI check. Synthetic API responses only; no participant data writes.
async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const source = {
    id: 'controls-layout', name: 'Kontroll av knappar', description: '<p>Introduktion.</p>'.repeat(30), occurrence: 'once', dependency: [],
    expand: { questions: [
      { id: 'kujwudwaahabsiz', type: 'section', text: '<p>Information om trygghet.</p>'.repeat(20), required: false, followup: [] },
      { id: 'choices', type: 'multipleChoice', text: '<p>En lång fråga som alltid måste lämna plats för knappar.</p>'.repeat(10), required: false, followup: [], expand: {
        options: { value: Array.from({ length: 12 }, (_, i) => `Alternativ ${i + 1} med en längre beskrivning.`), followup: [] },
        resource: { id: 'help', title: 'En lång hjälprubrik som måste kunna läsas utan att täcka stängknappen. '.repeat(6), description: '<p>Lång hjälpinformation.</p>'.repeat(50) },
      } },
    ] },
  }
  await page.unrouteAll({ behavior: 'wait' })
  await page.route('**/api/**', route => {
    const path = route.request().url()
    if (path.includes('/questionnaires/records/')) return route.fulfill({ json: source })
    if (path.includes('/users/records/')) return route.fulfill({ json: { id: 'layout-user', type: 'PRE' } })
    return route.fulfill({ json: { page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] } })
  })
  await page.addInitScript(() => {
    document.cookie = 'auth=; Max-Age=0; path=/'
    localStorage.setItem('auth', JSON.stringify({ token: 'layout-test', model: { id: 'layout-user', type: 'PRE' } }))
  })
  const failures = []
  let checked = 0
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const check = async (locator, name, scrollIntoView = false) => {
    if (scrollIntoView) await locator.scrollIntoViewIfNeeded()
    const result = await locator.evaluate(button => {
      // Disabled navigation must remain visible too, even though it cannot click.
      const original = button.style.pointerEvents
      button.style.pointerEvents = 'auto'
      const r = button.getBoundingClientRect()
      const points = [[.5, .5], [.2, .2], [.8, .2], [.2, .8], [.8, .8]]
      const covered = points.some(([x, y]) => !button.contains(document.elementFromPoint(r.left + r.width * x, r.top + r.height * y)))
      button.style.pointerEvents = original
      return { covered, outside: r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1, width: r.width, height: r.height }
    })
    checked++
    if (result.covered || result.outside || !result.width || !result.height) failures.push({ name, ...result })
  }
  const checkChrome = async label => {
    const buttons = page.locator('.questionnaire-header button, .questionnaire-footer button')
    for (let i = 0; i < await buttons.count(); i++) await check(buttons.nth(i), `${label} control ${i}`)
  }
  for (const viewport of [{ width: 320, height: 480 }, { width: 667, height: 320 }, { width: 320, height: 240 }, { width: 320, height: 568, largeText: true }]) {
    const label = `${viewport.width}x${viewport.height}${viewport.largeText ? ' enlarged text' : ''}`
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.evaluate(() => localStorage.removeItem('controls-layout'))
    await page.goto('http://127.0.0.1:4173/forms/controls-layout')
    if (viewport.largeText) await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    await check(page.getByRole('button', { name: 'Gå vidare', exact: true }), `${label} intro`, true)
    await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
    await settle()
    await checkChrome(`${label} safety section`)
    await check(page.getByRole('button', { name: 'Gå vidare', exact: true }), `${label} section continue`, true)
    await page.getByTestId('questionnaire-next').click()
    await page.getByRole('button', { name: /Visa hjälp:/ }).waitFor()
    await checkChrome(`${label} long question top`)
    await page.getByTestId('question-scroll').evaluate(el => { el.scrollTop = el.scrollHeight })
    await checkChrome(`${label} long question bottom`)
    await check(page.getByRole('button', { name: /Visa hjälp:/ }), `${label} help trigger`, true)
    await page.getByRole('button', { name: /Visa hjälp:/ }).click()
    await settle()
    await check(page.getByRole('button', { name: 'Stäng hjälp' }), `${label} help close top`)
    await page.getByRole('dialog').evaluate(dialog => {
      const body = dialog.querySelector('.questionnaire-dialog-scroll') ?? dialog
      body.scrollTop = body.scrollHeight
    })
    await check(page.getByRole('button', { name: 'Stäng hjälp' }), `${label} help close bottom`)
    await page.getByRole('button', { name: 'Stäng hjälp' }).click()
    await page.locator('[data-slot="dialog-overlay"]').waitFor({ state: 'hidden' })
    await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== 'none')
    await page.getByRole('button', { name: 'Se alla frågor', exact: true }).click()
    await settle()
    await check(page.getByRole('button', { name: 'Stäng frågor', exact: true }), `${label} menu close top`)
    await check(page.getByRole('button', { name: 'Lämna formuläret', exact: true }), `${label} leave form top`)
    await page.getByRole('dialog').evaluate(dialog => {
      const body = dialog.querySelector('.questionnaire-dialog-scroll') ?? dialog
      body.scrollTop = body.scrollHeight
    })
    await check(page.getByRole('button', { name: 'Stäng frågor', exact: true }), `${label} menu close bottom`)
    await check(page.getByRole('button', { name: 'Lämna formuläret', exact: true }), `${label} leave form bottom`)
    await page.getByRole('button', { name: 'Stäng frågor', exact: true }).click()
    await page.locator('[data-slot="dialog-overlay"]').waitFor({ state: 'hidden' })
    await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== 'none')
    // Rich HTML must not be able to paint over the question's help or navigation.
    await page.locator('.question-text').evaluate(text => {
      const oversized = document.createElement('div')
      oversized.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:white'
      oversized.textContent = 'Överstor formaterad frågetext'
      text.append(oversized)
    })
    await checkChrome(`${label} positioned content`)
    await check(page.getByRole('button', { name: /Visa hjälp:/ }), `${label} help with positioned content`, true)
  }
  // Open from a real previous document, then leave without submitting or deleting
  // the draft. This tests history navigation rather than a fixed destination.
  await page.route('**/form-return-target', route => route.fulfill({
    contentType: 'text/html', body: '<meta charset="utf-8"><h1>Previous page</h1><a href="/forms/controls-layout">Open form</a>',
  }))
  await page.goto('http://127.0.0.1:4173/form-return-target')
  await page.evaluate(() => localStorage.removeItem('controls-layout'))
  await page.getByRole('link', { name: 'Open form' }).click()
  await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
  await page.getByTestId('questionnaire-next').click()
  await page.locator('label[for="choices-option-11"]').click()
  await page.waitForFunction(() => localStorage.getItem('controls-layout')?.includes('Alternativ 12'))
  const draft = await page.evaluate(() => localStorage.getItem('controls-layout'))
  await page.getByRole('button', { name: 'Se alla frågor', exact: true }).click()
  await page.getByRole('dialog').locator('.questionnaire-dialog-scroll').evaluate(el => { el.scrollTop = el.scrollHeight })
  await page.getByRole('button', { name: 'Lämna formuläret', exact: true }).click()
  await page.waitForURL('**/form-return-target')
  if (await page.evaluate(() => localStorage.getItem('controls-layout')) !== draft) failures.push({ name: 'Leaving the form changed the saved draft' })
  if (failures.length) throw Error(JSON.stringify({ checked, failures }))
  return { checked, failures, navigationChecks: ['returns to previous page', 'retains saved draft'] }
}
