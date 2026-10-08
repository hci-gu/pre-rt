// Playwright CLI regression. Start with an authenticated local/test session.
// Reads pages only; never resets the shared test account or submits answers.
async (page) => {
  const origin = new URL(page.url()).origin
  const results = []
  const failures = []
  const check = async (label, largeText) => {
    await page.getByRole('region', { name: 'Studieöversikt' }).waitFor()
    if (largeText) await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    await page.evaluate(() => document.fonts.ready)
    const state = await page.getByRole('region', { name: 'Studieöversikt' }).evaluate(grid => {
      const cards = [...grid.querySelectorAll('article')].map(card => {
        const box = card.getBoundingClientRect()
        const title = card.querySelector('h2')
        const text = title.getBoundingClientRect()
        return {
          title: title.textContent,
          width: box.width, height: box.height,
          clipped: text.left < box.left || text.right > box.right + 1 || text.bottom > box.bottom + 1,
        }
      })
      return { cards, columns: getComputedStyle(grid).gridTemplateColumns, overflow: document.documentElement.scrollWidth > innerWidth + 1 }
    })
    results.push({ label, ...state })
    if (state.cards.length !== 6 || state.overflow || state.cards.some(card => card.clipped || card.height < 90)) failures.push({ label, ...state })
  }
  for (const viewport of [
    { width: 1920, height: 1080 }, { width: 1366, height: 768 },
    { width: 768, height: 1024 }, { width: 640, height: 800 }, { width: 639, height: 800 },
    { width: 390, height: 844 }, { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    for (const largeText of [false, true]) {
      const label = `${viewport.width}${largeText ? '-large-text' : ''}`
      await page.goto(origin + '/')
      await check(label + '-initial', largeText)
      await page.reload()
      await check(label + '-reload', largeText)
      await page.getByRole('link', { name: 'Frågor & svar', exact: true }).click()
      await page.getByRole('heading', { name: 'Frågor och svar', exact: true }).waitFor()
      await page.goBack()
      await check(label + '-history-back', largeText)
      await page.getByRole('link', { name: 'Läs om studien', exact: true }).click()
      await page.getByRole('link', { name: 'Start', exact: true }).click()
      await check(label + '-start-link', largeText)
      if ([1366, 320].includes(viewport.width)) {
        await page.screenshot({ path: `output/playwright/home-card-fix/home-${label}.png`, fullPage: true })
      }
    }
  }
  if (failures.length) throw Error(JSON.stringify({ checked: results.length, failures }))
  return { checked: results.length, results }
}
