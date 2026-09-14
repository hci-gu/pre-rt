import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStore, Provider } from 'jotai'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import Resource from '@/components/resource'
import { StudyAppShell } from '@/components/study-shell'
import QuestionSelector from '@/pages/form/components/QuestionSelector'
import type { Question } from '@/state'
import FaqResourcePage from './resource'
import FaqPage from './index'
import { resourceCollectionAtom, resourcesAtom, userDataAtom } from '@/state'

vi.mock('@/state', async () => {
  const { atom } = await import('jotai')
  const { atomFamily } = await import('jotai/utils')
  return {
    authAtom: atom(null),
    pb: { authStore: { clear() {} } },
    userDataAtom: atom({ type: 'PRE' }),
    resourcesAtom: atom([]),
    resourceCollectionAtom: atomFamily((id: string) =>
      atom({ id, name: 'Database category', resources: [] })
    ),
  }
})

afterEach(() => vi.unstubAllGlobals())

describe('PocketBase FAQ content', () => {
  it.each(['resource', 'resourceCollection', 'none'] as const)(
    'uses the stored %s relationship to offer questionnaire help',
    (relation) => {
      const question: Question = {
        id: 'question',
        text: 'En fråga utan några särskilda nyckelord',
        type: 'number',
        required: false,
        followup: [],
        number: 1,
        ...(relation === 'resource' ? {
          resource: { id: 'help', title: 'Linked answer', description: '<p>Help</p>' },
        } : relation === 'resourceCollection' ? {
          resourceCollection: { id: 'help', name: 'Linked category', resources: [] },
        } : {}),
      }
      function QuestionForm() {
        const form = useForm()
        return <FormProvider {...form}><QuestionSelector question={question} /></FormProvider>
      }
      const html = renderToStaticMarkup(<QuestionForm />)
      if (relation === 'none') {
        expect(html).not.toContain('Visa hjälp:')
      } else {
        expect(html).toContain(`Visa hjälp: Linked ${relation === 'resource' ? 'answer' : 'category'}`)
      }
    }
  )

  it.each([
    ['8vegqnt3c9mpnu7', 'Updated reason'],
    ['4mv1csl1xq95j2w', 'Updated instructions'],
    ['540wnc1pz0k7v44', 'Updated size'],
    ['v6uaw2lwupb43k1', 'Hur mäter jag längden på staven?'],
    ['newresource0001', 'Vilken längd passar mig?'],
  ])('renders stored HTML without overriding resource %s', (id, title) => {
    const html = renderToStaticMarkup(
      <Resource resource={{
        id,
        title,
        description: '<p>Edited in PocketBase</p><img src="/example.svg" alt="Stored media">',
      }} />
    )
    expect(html).toContain('Edited in PocketBase')
    expect(html).toContain('src="/example.svg"')
    expect(html).not.toContain('data:image')
  })

  it.each(['PRE', 'POST'] as const)('retains audience conditions for %s', (type) => {
    const store = createStore()
    // The production atom loads this value asynchronously; use its mocked
    // writable equivalent to render both audiences deterministically.
    store.set(userDataAtom as never, { type } as never)
    const html = renderToStaticMarkup(
      <Provider store={store}>
        <Resource resource={{
          id: 'faq000000000001',
          title: 'Timing',
          description: '<p>Shared</p><pre>PRE copy</pre>&lt;post&gt;POST copy&lt;/post&gt;',
        }} />
      </Provider>
    )
    expect(html).toContain('Shared')
    expect(html).toContain(`${type} copy`)
    expect(html).not.toContain(`${type === 'PRE' ? 'POST' : 'PRE'} copy`)
  })

  it.each(['1ei3zjui10q8q91', '94ze51rc8dz5oh6', '23s6oyiql5gc9qi'])(
    'uses exactly the stored titles and membership for collection %s',
    (id) => {
      vi.stubGlobal('window', { location: { hash: '' } })
      const store = createStore()
      store.set(resourceCollectionAtom(id) as never, {
        id,
        name: 'Name from database',
        pageTitle: 'Page title from database',
        footerContent: '<p>Footer from database</p>',
        resources: [
          { id: 'secondresource1', title: 'Second item first', description: '<p>Second</p>' },
          { id: 'firstresource01', title: 'First item second', description: '<p>First</p>' },
        ],
      } as never)
      const html = renderToStaticMarkup(
        <Provider store={store}>
          <MemoryRouter initialEntries={[`/faq/${id}`]}>
            <Routes>
              <Route path="/faq/:collectionId" element={
                <StudyAppShell><FaqResourcePage /></StudyAppShell>
              } />
            </Routes>
          </MemoryRouter>
        </Provider>
      )
      expect(html).toContain('Page title from database')
      expect(html.match(/Page title from database/g)).toHaveLength(2)
      expect(html).toContain('Footer from database')
      expect(html.indexOf('Second item first')).toBeLessThan(html.indexOf('First item second'))
      expect(html).not.toContain('När ska jag göra terapin?')
      expect(html).not.toContain('Kan jag raka könshåret?')
    }
  )

  it('shows an unavailable state instead of inventing a missing collection', () => {
    const store = createStore()
    store.set(resourceCollectionAtom('missing') as never, null as never)
    const html = renderToStaticMarkup(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/faq/missing']}>
          <Routes>
            <Route path="/faq/:collectionId" element={<FaqResourcePage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
    expect(html).toContain('Det gick inte att hämta kategorin.')
    expect(html).not.toContain('<h1')
  })

  it('shows all supplied categories and never fabricates empty-state categories', () => {
    const store = createStore()
    const render = () => renderToStaticMarkup(
      <Provider store={store}><MemoryRouter><FaqPage /></MemoryRouter></Provider>
    )
    expect(render()).not.toContain('Om intimvård')
    const collections = Array.from({ length: 6 }, (_, index) => ({
      id: `category${index}`,
      name: `Category ${index}`,
      resources: [],
      image: `/api/files/category${index}/wide.svg`,
      imageCompact: `/api/files/category${index}/compact.svg`,
    }))
    store.set(resourcesAtom as never, collections as never)
    const html = render()
    for (const collection of collections) {
      expect(html).toContain(collection.name)
      expect(html).toContain(`href="/faq/${collection.id}"`)
      expect(html).toContain(collection.imageCompact)
    }
  })
})
