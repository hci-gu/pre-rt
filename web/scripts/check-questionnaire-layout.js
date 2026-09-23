// Run through playwright-cli run-code --filename scripts/check-questionnaire-layout.js.
// All API responses are mocked. No participant data is read or submitted.
async (page) => {
  const base = 'http://127.0.0.1:4173'
  const longLabel = 'Ett längre svarsalternativ med information som måste gå att läsa i sin helhet även på en liten telefon.'
  const scenarios = [
    { name: 'four-options', type: 'singleChoice', count: 4 },
    { name: 'seven-options', type: 'singleChoice', count: 7 },
    { name: 'twelve-options', type: 'multipleChoice', count: 12 },
    { name: 'long-options', type: 'multipleChoice', count: 8, long: true },
    { name: 'long-section', type: 'section', text: '<p>Längre information som måste visas i sin helhet.</p>'.repeat(25) },
    { name: 'pain-scale', type: 'painScale' },
    { name: 'date', type: 'date' },
    { name: 'text', type: 'text' },
    { name: 'number', type: 'number' },
    { name: 'amount', type: 'multipleChoice', count: 7, amount: true },
    { name: 'option-followups', type: 'multipleChoice', count: 7, followups: true },
    { name: 'unbroken-label', type: 'singleChoice', count: 3, unbroken: true },
    { name: 'long-question', type: 'singleChoice', count: 4, text: `<p>${longLabel.repeat(5)}</p>` },
    { name: 'safety-section', type: 'section', id: 'kujwudwaahabsiz', text: '<p>Information om trygghet och stöd.</p>'.repeat(20) },
    { name: 'rich-content', type: 'section', text: '<p>Information med en bred tabell.</p><table style="width:1200px"><tr><td>LångtabelltextutanmellanrumLångtabelltextutanmellanrum</td><td>Mer information</td></tr></table>' },
  ]
  const emptyList = { page: 1, perPage: 100, totalItems: 0, totalPages: 0, items: [] }
  let source
  await page.route('**/api/**', async (route) => {
    const path = route.request().url()
    if (path.includes('/questionnaires/records/')) return route.fulfill({ json: source })
    if (path.includes('/users/records/')) return route.fulfill({ json: { id: 'layout-user', type: 'PRE' } })
    if (path.includes('/answers/records')) return route.fulfill({ json: emptyList })
    return route.fulfill({ json: emptyList })
  })
  await page.addInitScript(() => {
    localStorage.clear()
    document.cookie = 'auth=; Max-Age=0; path=/'
    localStorage.setItem('auth', JSON.stringify({ token: 'layout-test', model: { id: 'layout-user', type: 'PRE' } }))
  })
  const failures = []
  const results = []
  let unsupportedWheelChecks = 0
  const viewports = [{ width: 320, height: 480 }, { width: 320, height: 568 }, { width: 360, height: 640 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 320, height: 240 }, { width: 320, height: 568, largeText: true }, { width: 1280, height: 900 }]
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    for (const scenario of scenarios) {
      const options = Array.from({ length: scenario.count ?? 0 }, (_, i) =>
        `${i + 1}. ${scenario.long ? longLabel : scenario.unbroken ? 'Långtsvar'.repeat(30) : scenario.amount && i === 0 ? 'Använt {AMOUNT} gånger' : 'Ett svarsalternativ'}`)
      source = {
        id: 'layout-fixture', name: 'Layoutkontroll', description: '<p>Introduktion</p>', occurrence: 'once', dependency: [],
        expand: { questions: [{
          id: scenario.id ?? 'layout-question', text: scenario.text ?? '<p>Hur har du mått under den senaste veckan?</p>',
          type: scenario.type, required: false, followup: [],
          expand: { options: { value: options, followup: scenario.followups ? ['Ibland', 'Ofta', 'Hela tiden'] : [] } },
        }] },
      }
      await page.goto(`${base}/forms/layout-fixture`)
      if (viewport.largeText) await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
      await page.getByRole('button', { name: 'Gå vidare', exact: true }).click()
      await page.getByTestId('questionnaire-pages').waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const result = await page.evaluate(() => {
        const section = document.querySelector('[data-testid="questionnaire-pages"] section')
        const card = section.firstElementChild
        const rect = card.getBoundingClientRect()
        const header = document.querySelector('.questionnaire-header').getBoundingClientRect()
        const footer = document.querySelector('.questionnaire-footer').getBoundingClientRect()
        const bounds = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }
        const scrollable = [card, section].find(el => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight)
        const clipped = rect.top < header.bottom - 1 || rect.bottom > footer.top + 1 || rect.left < -1 || rect.right > innerWidth + 1 || rect.height < 1
        const horizontal = card.scrollWidth > card.clientWidth + 1
        const smallScreen = innerWidth <= 480 || (innerWidth <= 940 && innerHeight <= 480)
        const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize)
        const minimumFont = rootFont * (smallScreen ? .875 : 1)
        const smallTargets = [...card.querySelectorAll('.question-chip')].some(el => el.getBoundingClientRect().height < 43 || parseFloat(getComputedStyle(el).fontSize) < minimumFont - .1)
        const smallInputs = [...card.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])')].some(el => parseFloat(getComputedStyle(el).fontSize) < rootFont - .1)
        const scrollers = [...document.querySelectorAll('.questionnaire-shell, .questionnaire-shell *')].filter(el => /auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1)
        const nestedScroll = scrollers.length > 1 || getComputedStyle(document.documentElement).overflowY !== 'hidden' || getComputedStyle(document.body).overflowY !== 'hidden'
        const fontScale = Number(section.dataset.fontScale)
        const prematureScroll = smallScreen && Boolean(scrollable) && fontScale !== .875
        return { bounds, clipped, horizontal, smallTargets, smallInputs, nestedScroll, prematureScroll, fontScale, scrolling: Boolean(scrollable), density: section.dataset.density, viewport: [innerWidth, innerHeight] }
      })
      const label = `${scenario.name} ${viewport.width}x${viewport.height}${viewport.largeText ? ' enlarged-text' : ''}`
      results.push({ scenario: label, scrolling: result.scrolling, density: result.density, fontScale: result.fontScale })
      if (result.clipped || result.horizontal || result.smallTargets || result.smallInputs || result.nestedScroll || result.prematureScroll) failures.push({ scenario: label, ...result })
      // Scrolling a long question must never move to a different question.
      const scroll = page.getByTestId('question-scroll')
      const before = await page.getByTestId('questionnaire-pages').getAttribute('data-current-page')
      const box = await scroll.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      try {
        await page.mouse.wheel(0, 600)
      } catch (error) {
        if (!String(error).includes('Mouse wheel is not supported in mobile WebKit')) throw error
        // Mobile WebKit automation has no wheel device. Still verify native
        // scroll-container geometry/reachability; touch is checked in Chromium.
        unsupportedWheelChecks++
        await scroll.evaluate(el => { el.scrollTop += 600 })
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const after = await page.getByTestId('questionnaire-pages').getAttribute('data-current-page')
      if (before !== after) failures.push({ scenario: label, error: 'Scrolling navigated to another question' })
      // Every option's label must be reachable in the scroll area (even when a
      // very long individual label is itself taller than the available screen).
      const unreachable = await page.evaluate(async () => {
        const scroll = document.querySelector('[data-testid="question-scroll"]')
        const failures = []
        for (const el of scroll.querySelectorAll('.question-chip')) {
          el.scrollIntoView({ block: 'start', inline: 'nearest' })
          const bounds = scroll.getBoundingClientRect()
          const rect = el.getBoundingClientRect()
          const y = Math.max(bounds.top, rect.top) + Math.min(bounds.height, rect.height) / 2
          const hit = document.elementFromPoint(rect.left + rect.width / 2, Math.min(y, bounds.bottom - 2))
          if (!hit || !el.contains(hit)) failures.push(el.textContent.slice(0, 35))
        }
        return failures
      })
      if (unreachable.length) failures.push({ scenario: label, unreachable })
      if (scenario.type === 'date') {
        await page.getByRole('button', { name: 'Välj datum' }).click()
        const calendar = page.locator('[data-radix-popper-content-wrapper]')
        const bounds = await calendar.boundingBox()
        if (bounds.x < -1 || bounds.y < -1 || bounds.x + bounds.width > viewport.width + 1 || bounds.y + bounds.height > viewport.height + 1) {
          failures.push({ scenario: label, error: 'Calendar outside viewport', bounds })
        }
        await page.keyboard.press('Escape')
      }
    }
  }
  if (!results.some(result => result.fontScale < 1 && !result.scrolling)) failures.push({ error: 'No question fitted using the smaller font steps' })
  if (failures.length) throw Error(JSON.stringify({ checked: results.length, failures }))
  return { checked: results.length, failures, unsupportedWheelChecks, results }
}
