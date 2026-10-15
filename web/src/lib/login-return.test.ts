import { describe, expect, it } from 'vitest'
import { loginReturnPath, loginReturnSearch, safeFormReturnPath } from './login-return'

describe('questionnaire links through login', () => {
  it('preserves a follow-up link and a dated daily questionnaire through every login step', () => {
    for (const path of ['/forms/355082bf942bf57', '/forms/sdzkpd49ndccf5b?date=2026-10-08']) {
      let search = loginReturnSearch(path)
      for (let step = 0; step < 3; step++) {
        expect(loginReturnPath(search)).toBe(path)
        search = loginReturnSearch(loginReturnPath(search))
      }
    }
  })
  it.each([null, '', '/', 'https://evil.example', '//evil.example', '/\\evil.example',
    '/forms/355082bf942bf57/../../login', '/forms/355082bf942bf57?returnTo=https://evil.example',
    '/forms/%2f%2fevil.example', 'javascript:alert(1)', '/forms/355082bf942bf57\n',
  ])('uses home for an invalid destination %s', value => {
    expect(safeFormReturnPath(value)).toBe('/')
    expect(loginReturnPath(`?${new URLSearchParams({ returnTo: value ?? '' })}`)).toBe('/')
  })
})
