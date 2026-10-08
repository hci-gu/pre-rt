// Local browser regression for approved Aina items 1–11. All API data is synthetic.
// Run from repo root: playwright-cli --session aina run-code --filename web/scripts/check-aina-review.js
async page => {
  const origin = new URL(page.url()).origin
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw Error('Use a local preview')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.unrouteAll({ behavior: 'wait' })
  const assert = (condition, message) => { if (!condition) throw Error(message) }
  const list = items => ({ page: 1, totalPages: 1, totalItems: items.length, items })
  const answers = []
  const sectionText = '<p><strong>FRÅGOR OM SEXUALITET</strong></p><p>&nbsp;</p><h2><strong>Här är en förklaring som ska finnas på informationssidan men inte i frågelistan.</strong></h2><p>Hela förklaringen ska finnas kvar.</p>'
  const resource = { id:'answer', sourceKey:'test.answer',title:'En fråga med ett svar',content:{schemaVersion:1,audience:{},blocks:[{type:'paragraph',inline:[{text:'Här finns ett svar som hör ihop med sin fråga.'}]}]}}
  const collection = id => ({id,name:id==='about'?'Information om studien':id==='after-treatment'?'Efter strålbehandlingen':'Testkategori',resources:['answer'],expand:{resources:[resource]},visible_on_questions_and_answers:true})
  await page.route('**/test-login', route=>route.fulfill({status:404,json:{}}))
  await page.route('**/daily-schedule', route=>route.fulfill({json:{startDate:'2026-01-01',endDate:'2026-12-31'}}))
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname
    if(path.includes('/studySettings/records')) return route.fulfill({json:list([{id:'settings',key:'default',baselineQuestionnaire:'baseline-form',dailyQuestionnaire:'daily-form',treatmentEndQuestionnaire:'end-form',treatmentEndQuestion:'end-date',aboutCollection:'about',afterTreatmentCollection:'after-treatment'}])})
    if(path.includes('/users/records/')) return route.fulfill({json:{id:'aina-user',type:'PRE',diagnosis:'corpus',treatmentStart:'2026-07-01'}})
    if(path.includes('/questionnaires/records/')) {
      const id=path.split('/').pop()
      return route.fulfill({json:{id,name:'Testformulär',occurrence:id==='daily-form'?'daily':'once',dependency:[],description:'<p>Introduktion.</p>',expand:{questions:[
        {id:'section',type:'section',text:sectionText,required:false,followup:[]},
        {id:'comment',type:'text',text:'En valfri kommentar',required:false,followup:[]},
      ]}}})
    }
    if(path.includes('/answers/records')) {
      if(route.request().method()==='POST') {
        const answer={id:`answer-${answers.length}`,created:'2026-10-08 12:00:00.000Z',...route.request().postDataJSON()}
        answers.push(answer);return route.fulfill({json:answer})
      }
      return route.fulfill({json:list(answers)})
    }
    if(path.includes('/resourceCollection/records/')) return route.fulfill({json:collection(path.split('/').pop())})
    if(path.endsWith('/resourceCollection/records')) return route.fulfill({json:list([collection('category')])})
    return route.fulfill({json:list([])})
  })
  await page.evaluate(()=>localStorage.clear())
  await page.setViewportSize({width:1280,height:900})
  await page.goto(origin+'/login')
  await page.getByRole('textbox',{name:'Telefonnummer',exact:true}).waitFor()
  assert(await page.locator('main').evaluate(el=>el.getBoundingClientRect().width===innerWidth),'Login still uses a desktop column')
  await page.screenshot({path:'output/playwright/aina-login.png',fullPage:true})
  await page.addInitScript(()=>localStorage.setItem('auth',JSON.stringify({token:'test-token',model:{id:'aina-user',type:'PRE'}})))
  const layouts=[]
  for(const width of [1280,640,390,320]) {
    await page.setViewportSize({width,height:900})
    for(const path of ['/faq','/faq/category','/faq/mer','/about','/after-treatment','/check-in','/forms/daily-form/history','/profile']) {
      await page.goto(origin+path)
      await page.getByRole('link',{name:/Tillbaka till/}).last().waitFor()
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows: '+path+' '+width)
      const headingSize=await page.locator('main h1').evaluate(el=>getComputedStyle(el).fontSize)
      if(width===1280) assert(headingSize===(['/faq','/faq/mer','/check-in','/profile'].includes(path)?'36px':'24px'),'Wrong heading size: '+path)
      if(path==='/check-in' && width>=640) {
        assert(await page.getByRole('heading',{name:'Fyll i formulär - annan dag',exact:true}).evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length===1}),'Daily card title wraps at '+width)
      }
      if(path.endsWith('/history')) {
        assert(await page.getByRole('navigation',{name:'breadcrumb'}).count()===1,'Duplicated history breadcrumbs')
        assert((await page.getByRole('navigation',{name:'breadcrumb'}).innerText()).includes('Tidigare dagar'),'Missing history breadcrumb')
      }
      if(path==='/faq/category') {
        const trigger=page.getByRole('button',{name:resource.title,exact:true});await trigger.click()
        await page.getByRole('region',{name:resource.title}).waitFor()
        assert(await trigger.evaluate(el=>{const region=document.getElementById(el.getAttribute('aria-controls'));const icon=el.querySelector('svg');return Math.abs(region.getBoundingClientRect().top-el.getBoundingClientRect().bottom)<1 && getComputedStyle(icon).width==='24px'}),'Accordion is disconnected or arrow too small')
        if(width===1280 || width===320)await page.screenshot({path:`output/playwright/aina-accordion-${width}.png`,fullPage:true})
      }
      layouts.push({width,path,headingSize})
    }
  }
  // Submit each type through the real form flow, without writing participant data.
  for(const id of ['baseline-form','daily-form','other-form']) {
    await page.setViewportSize({width:1280,height:900})
    await page.goto(origin+'/forms/'+id)
    await page.getByRole('button',{name:'Gå vidare',exact:true}).click()
    await page.locator('.question-section').waitFor()
    assert(await page.locator('.question-card').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('.questionnaire-header').getBoundingClientRect().bottom<40),'Question card sits too low')
    assert(await page.locator('.question-section-body p').first().evaluate(el=>getComputedStyle(el).fontWeight==='400'),'Section body is still bold')
    await page.getByRole('button',{name:'Se alla frågor',exact:true}).click()
    const menu=page.getByRole('dialog')
    assert((await menu.innerText()).includes('FRÅGOR OM SEXUALITET'),'Missing menu heading')
    assert(!(await menu.innerText()).includes('Här är en förklaring'),'Menu includes section body')
    await page.getByRole('button',{name:'Stäng frågor',exact:true}).click()
    await page.screenshot({path:`output/playwright/aina-section-${id}.png`,fullPage:true})
    await page.getByRole('button',{name:'Gå vidare',exact:true}).click()
    await page.getByRole('textbox').waitFor()
    await page.getByRole('button',{name:'Gå vidare',exact:true}).click()
    await page.getByTestId('questionnaire-submit').waitFor()
    assert((await page.locator('.question-card').innerText()).includes('Vill du kolla igenom dina svar'),'Missing submission guidance')
    await page.screenshot({path:`output/playwright/aina-submit-${id}.png`,fullPage:true})
    await page.getByTestId('questionnaire-submit').click()
    const close=page.getByRole('link',{name:'Stäng formuläret',exact:true});await close.waitFor()
    assert(await close.getAttribute('href')===(id==='daily-form'?'/check-in':'/'),'Wrong return route: '+id)
    if(id!=='daily-form')assert(!(await page.locator('main').innerText()).includes('dagliga användning'),'Daily wording on other form')
    await page.reload()
    assert(await page.getByRole('link',{name:'Stäng formuläret',exact:true}).getAttribute('href')===(id==='daily-form'?'/check-in':'/'),'Success destination lost on refresh')
  }
  return {layouts,submittedForms:answers.map(a=>a.questionnaire),checks:'Items 1–11 passed; item 12 deferred'}
}
