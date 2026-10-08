// Playwright CLI check against an authenticated local/test browser session.
// Run with: playwright-cli --session <name> run-code --filename web/scripts/check-faq-card-images.js
// Uses the session's origin and only reads data. No API mocks or participant writes.
async (page) => {
  const faqURL = new URL('/faq', page.url()).href
  const expected = [
    'Strålbehandling och biverkningar',
    'Användning av vaginalstav',
    'Om intimvård',
    'Om sexuell hälsa',
    'Frågor om våld',
    'Om du vill veta mer',
  ]
  const checks = []
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(faqURL)
    await page.getByRole('link', { name: expected[0], exact: true }).waitFor()
    const cards = page.locator('main a[href^="/faq/"]')
    if (await cards.count() !== expected.length) throw Error('Expected all six FAQ cards')
    const labels = await cards.allTextContents()
    for (const name of expected) {
      if (!labels.some(label => label.trim() === name)) throw Error(`Missing FAQ card: ${name}`)
    }
    // Checking only existing img elements misses the original bug (no img at all).
    const images = await cards.evaluateAll(async links => Promise.all(links.map(async link => {
      const img = link.querySelector('img')
      if (!img) throw Error(`Missing illustration: ${link.textContent.trim()}`)
      await img.decode()
      const rect = img.getBoundingClientRect()
      const style = getComputedStyle(img)
      const source = link.querySelector('source')
      const responsiveSource = innerWidth <= 640 ? source?.srcset : img.src
      return {
        name: link.textContent.trim(),
        src: img.currentSrc,
        responsiveSource: responsiveSource ? new URL(responsiveSource, location.href).href : null,
        loaded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
      }
    })))
    for (const image of images) {
      if (!image.loaded || !image.visible || image.src !== image.responsiveSource) {
        throw Error(`FAQ artwork failed at ${viewport.width}px: ${JSON.stringify(image)}`)
      }
    }
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) {
      throw Error(`FAQ overflow at ${viewport.width}px`)
    }
    await page.screenshot({ path: `output/playwright/faq-art-fix/faq-${viewport.width}.png`, fullPage: true })
    checks.push({ viewport, images })
  }
  return { cardsPerViewport: expected.length, checks }
}
