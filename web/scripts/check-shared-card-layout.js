// Browser regression check using isolated API fixtures; no participant data is read or written.
// Run against local Vite: playwright-cli --session cards run-code --filename web/scripts/check-shared-card-layout.js
async (page) => {
  const list = items => ({ page: 1, totalPages: 1, totalItems: items.length, items })
  await page.route('**/api/**', route => route.fulfill({status:404,json:{}}))
  await page.route('**/test-login', route => route.fulfill({status:404,json:{}}))
  await page.route('**/api/collections/users/records/test-user', route => route.fulfill({json:{id:'test-user',type:'PRE',diagnosis:'corpus',treatmentStart:'2026-07-01'}}))
  await page.route('**/api/collections/studySettings/records**', route => route.fulfill({json:list([{id:'settings',key:'default',baselineQuestionnaire:'baseline-form',dailyQuestionnaire:'daily-form',treatmentEndQuestionnaire:'treatment-end-form',treatmentEndQuestion:'treatment-end-date',aboutCollection:'about',afterTreatmentCollection:'after-treatment'}])}))
  await page.route('**/api/collections/answers/records**', route => route.fulfill({json:list([{id:'baseline-answer',questionnaire:'baseline-form',user:'test-user',answers:{},created:'2026-07-01',date:'2026-07-01'}])}))
  await page.route('**/api/collections/resourceAsset/records**', route => route.fulfill({json:list([])}))
  await page.route('**/api/collections/resourceCollection/records**', route => route.fulfill({json:list([{id:'radiation',name:'Strålbehandling och biverkningar',visible_on_questions_and_answers:true,resources:[],expand:{resources:[]}}])}))
  await page.addInitScript(() => localStorage.setItem('auth', JSON.stringify({token:'test-token',model:{id:'test-user',type:'test',phoneNumber:'+46700000000'}})))
  const origin = new URL(page.url()).origin
  const results=[]
  for (const width of [1280, 390, 320, 640]) {
    await page.setViewportSize({width,height:900})
    for (const path of ['/', '/faq']) {
      await page.goto(origin+path)
      await page.getByText(path==='/'?'Registrera dig':'Strålbehandling och biverkningar',{exact:true}).waitFor()
      const measurements=await page.locator(path==='/'?'section[aria-label="Studieöversikt"] article':'main a[href^="/faq/"]').evaluateAll(cards => cards.map(card => {
        const title=card.querySelector('h2') || card.querySelector('span')
        const c=card.getBoundingClientRect(), t=title.getBoundingClientRect()
        return {title:title.textContent,offset:t.top-c.top,height:c.height, fits:t.bottom<=c.bottom && t.right<=c.right,align:getComputedStyle(title).textAlign}
      }))
      await page.screenshot({path:`output/playwright/cards/${path==='/'?'home':'faq'}-${width}.png`,fullPage:true})
      for (const card of measurements) {
        if (Math.abs(card.offset - (width >= 640 ? 16 : 12)) > 1 || !card.fits || card.align !== (width >= 640 ? 'center' : 'left')) {
          throw Error(`Card title misplaced at ${width}px on ${path}: ${JSON.stringify(card)}`)
        }
      }
      results.push({width,path,measurements})
    }
  }
  return results
}
