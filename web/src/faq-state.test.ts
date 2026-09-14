import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'jotai'
import { ResourceSessionError } from './lib/resource-errors'

const api = vi.hoisted(() => ({
  getUser: vi.fn(),
  getCollections: vi.fn(),
  getCollection: vi.fn(),
  getSettings: vi.fn(),
}))

vi.mock('js-cookie', () => ({
  default: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}))

vi.mock('pocketbase', () => ({
  default: class {
    autoCancellation() {}
    authStore = { token: 'test-token', model: { id: 'test-user' }, save() {} }
    files = { getURL: () => '/stored-image.svg' }
    collection(name: string) {
      return name === 'users'
        ? { getOne: api.getUser }
        : { getFullList: api.getCollections, getOne: api.getCollection, getFirstListItem: api.getSettings }
    }
  },
}))

// The storage adapter is evaluated when state.tsx creates authAtom.
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {},
})
const { authAtom, resourcesAtom, resourceCollectionAtom, studySettingsAtom, aboutCollectionAtom } = await import('./state')

beforeEach(() => {
  vi.clearAllMocks()
  api.getUser.mockResolvedValue({ id: 'test-user' })
  api.getCollections.mockResolvedValue([])
})

describe('study settings relationships', () => {
  const configured = {
    baselineQuestionnaire: 'new-baseline', dailyQuestionnaire: 'new-daily',
    treatmentEndQuestionnaire: 'new-end', treatmentEndQuestion: 'new-date',
    aboutCollection: 'new-about',
  }

  it('loads the configured about collection and preserves resource relation order', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getSettings.mockResolvedValue(configured)
    api.getCollection.mockResolvedValue({
      id: 'new-about', name: 'Configured study', resources: ['second', 'first'],
      expand: { resources: [
        { id: 'first', title: 'First', description: '' },
        { id: 'second', title: 'Second', description: '' },
      ] },
    })
    const collection = await store.get(aboutCollectionAtom)
    expect(api.getSettings).toHaveBeenCalledWith('key = "default"')
    expect(api.getCollection).toHaveBeenCalledWith('new-about', { expand: 'resources' })
    expect(collection?.resources.map((resource) => resource.id)).toEqual(['second', 'first'])
  })

  it('rejects incomplete configuration without falling back to record IDs', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getSettings.mockResolvedValue({ ...configured, dailyQuestionnaire: '' })
    await expect(store.get(studySettingsAtom)).rejects.toThrow()
  })

  it('can retry loading settings after a failed request', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getSettings.mockRejectedValueOnce({ status: 503 }).mockResolvedValue(configured)
    await expect(store.get(studySettingsAtom)).rejects.toMatchObject({ status: 503 })
    store.set(studySettingsAtom)
    await expect(store.get(studySettingsAtom)).resolves.toEqual(configured)
  })
})

describe('FAQ loading with a saved session', () => {
  it('rejects a stale login instead of displaying a misleading empty list', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getUser.mockRejectedValue({ status: 404 })

    await expect(store.get(resourcesAtom)).rejects.toBeInstanceOf(ResourceSessionError)
    expect(api.getCollections).not.toHaveBeenCalled()
  })

  it('reloads the list after signing in again', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getUser.mockRejectedValueOnce({ status: 404 })
    await expect(store.get(resourcesAtom)).rejects.toBeInstanceOf(ResourceSessionError)

    api.getCollections.mockResolvedValue([
      { id: 'category', name: 'Stored category', resources: [] },
    ])
    store.set(authAtom, { id: 'test-user' })
    await expect(store.get(resourcesAtom)).resolves.toMatchObject([
      { id: 'category', name: 'Stored category' },
    ])
  })

  it('allows retrying a failed request without reloading the application', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getCollections.mockRejectedValueOnce({ status: 503 })
    await expect(store.get(resourcesAtom)).rejects.toMatchObject({ status: 503 })

    store.set(resourcesAtom)
    await expect(store.get(resourcesAtom)).resolves.toEqual([])
  })

  it('does not mistake a network outage for an expired login', async () => {
    const store = createStore()
    store.set(authAtom, { id: 'test-user' })
    api.getUser.mockRejectedValue({ status: 0 })
    await expect(store.get(resourcesAtom)).rejects.toMatchObject({ status: 0 })
  })

  it('reloads an individual collection when the login changes', async () => {
    const store = createStore()
    const collection = resourceCollectionAtom('category')
    await expect(store.get(collection)).resolves.toBeNull()
    expect(api.getCollection).not.toHaveBeenCalled()

    store.set(authAtom, { id: 'test-user' })
    api.getCollection.mockResolvedValue({ id: 'category', name: 'Stored category', resources: [] })
    await expect(store.get(collection)).resolves.toMatchObject({ id: 'category' })
  })
})
