// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeLegacyResourceHTML } from './legacy-html'

describe('temporary legacy resource HTML', () => {
  it('preserves prose, formatting, illustrations and telephone links', () => {
    const html = '<p><strong>Text</strong></p><ol start="3"><li>Step</li></ol><img src="/image.png" alt="Illustration"><a href="tel:112">112</a>'
    expect(sanitizeLegacyResourceHTML(html)).toBe(html)
  })
  it('removes active content, unsafe links and event handlers', () => {
    const html = sanitizeLegacyResourceHTML('<p onclick="alert(1)">Keep me</p><script>alert(1)</script><iframe src="https://example.com"></iframe><a href="javascript:alert(1)">Link</a><img src="/image.png" onerror="alert(1)"><svg onload="alert(1)"></svg>')
    expect(html).toContain('Keep me')
    expect(html).toContain('src="/image.png"')
    expect(html).not.toMatch(/script|iframe|onclick|onerror|svg|javascript/)
  })
})
