import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStore, Provider } from 'jotai'
import { MemoryRouter } from 'react-router-dom'
import { aboutCollectionAtom } from '@/state'
import AboutPage from './about'
import AfterTreatmentPage from './after-treatment'
import HomePage from './home'
import CheckInPage from './check-in'
import { StudyAppShell } from '@/components/study-shell'

vi.mock('@/state', async () => {
  const { atom } = await import('jotai')
  return {
    authAtom: atom({ id: 'test' }),
    userDataAtom: atom({ type: 'PRE' }),
    readAboutPageAtom: atom(false),
    aboutCollectionAtom: atom(null),
    resourceCollectionAtom: () => atom(null),
    studySettingsAtom: atom({
      baselineQuestionnaire: 'configured-baseline',
      dailyQuestionnaire: 'configured-daily',
      treatmentEndQuestionnaire: 'configured-end',
    }),
    useAnswers: () => [],
    pb: {},
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('study pages', () => {
  it('renders only the configured collection and resource titles on About', () => {
    vi.stubGlobal('window', { location: { hash: '' } })
    const store = createStore()
    store.set(aboutCollectionAtom as never, {
      id: 'different-collection', name: 'Edited study title',
      description: '<p>Edited study introduction</p>',
      resources: [
        { id: 'new-contact', title: 'Edited contact heading', description: '<p>Stored contact</p>' },
      ],
    } as never)
    const html = renderToStaticMarkup(<Provider store={store}><AboutPage /></Provider>)
    expect(html).toContain('Edited study title')
    expect(html).toContain('Edited study introduction')
    expect(html).toContain('Edited contact heading')
    expect(html).not.toContain('Therese Alm')
    expect(html).not.toContain('startar vaginalstavsterapin före strålstart')
    expect(html).not.toContain('Hur går studien till?')
  })

  it('does not fabricate study information if the collection is unavailable', () => {
    const html = renderToStaticMarkup(<Provider><AboutPage /></Provider>)
    expect(html).toContain('Det gick inte att hämta informationen om studien.')
    expect(html).not.toContain('<h1')
  })

  it('uses configured form relations in dashboard and check-in links', () => {
    const home = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(home).toContain('href="/forms/configured-baseline"')
    expect(home).toContain('href="/after-treatment"')
    const checkIn = renderToStaticMarkup(<MemoryRouter><CheckInPage /></MemoryRouter>)
    expect(checkIn).toContain('href="/forms/configured-daily"')
    expect(checkIn).toContain('href="/forms/configured-daily/history"')
    expect(checkIn).toContain('href="/forms/configured-end"')
  })

  it('provides the empty post-treatment page with study breadcrumbs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/after-treatment']}>
        <StudyAppShell><AfterTreatmentPage /></StudyAppShell>
      </MemoryRouter>
    )
    expect(html.match(/Efter strålbehandlingen/g)).toHaveLength(2)
    expect(html).toContain('href="/"')
  })
})
