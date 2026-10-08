// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sectionContent } from './section-content'

describe('imported section presentation', () => {
  it('separates the heading and preserves all body text without whole-paragraph bold', () => {
    const section = sectionContent('<p><strong>FRÅGOR OM SEXUALITET</strong></p><p>&nbsp;</p><h2><strong>Här finns hela förklaringen.</strong></h2><p>Mer text med <strong>viktig</strong> betoning.</p>')
    expect(section.title).toBe('FRÅGOR OM SEXUALITET')
    expect(section.body).toBe('<p>Här finns hela förklaringen.</p><p>Mer text med <strong>viktig</strong> betoning.</p>')
  })

  it('does not turn a long introductory paragraph into a menu heading or remove it', () => {
    const introduction = 'En lång inledning som behöver finnas kvar i sin helhet. '.repeat(8)
    const section = sectionContent(`<h4>${introduction}</h4><p>Fortsättning.</p>`)
    expect(section.title).toBe('Information')
    expect(section.body).toContain(introduction)
    expect(section.body).toContain('Fortsättning.')
  })

  it('keeps inline emphasis, links and line breaks while removing unsafe markup and styling', () => {
    const section = sectionContent('<p>FRÅGOR OM VÅLD</p><p style="position:fixed;font-weight:900">Rad ett<br>rad två. <a href="/faq">Läs mer</a><script>alert(1)</script></p>')
    expect(section.body).toBe('<p>Rad ett<br>rad två. <a href="/faq">Läs mer</a></p>')
  })

  it('supports title-only and empty sections', () => {
    expect(sectionContent('Stored section heading')).toEqual({ title: 'Stored section heading', body: '' })
    expect(sectionContent('<p>&nbsp;</p>')).toEqual({ title: 'Information', body: '' })
  })
})
