import { expect, it } from 'vitest'
import { eligibleHistoryDate } from './history-calendar'

it('includes boundary days and missed days, excluding days after the schedule or today', () => {
  const start = new Date(2026, 8, 1), end = new Date(2026, 8, 30), now = new Date(2026, 9, 7, 10)
  expect(eligibleHistoryDate(new Date(2026, 8, 1, 12), start, end, now)).toBe(true)
  expect(eligibleHistoryDate(new Date(2026, 8, 30, 12), start, end, now)).toBe(true)
  expect(eligibleHistoryDate(new Date(2026, 9, 1), start, end, now)).toBe(false)
  expect(eligibleHistoryDate(new Date(2026, 9, 7, 12), start, null, now)).toBe(true)
  expect(eligibleHistoryDate(new Date(2026, 9, 8), start, null, now)).toBe(false)
  expect(eligibleHistoryDate(now, null, end, now)).toBe(false)
})
