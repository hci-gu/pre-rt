import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ResourceContent from '.'
import { audienceMatches, parseContent, resolveAnchor, safeContentURL, type Block } from './model'
import bundle from '../../../../content/resources/generated/bundle.json'

describe('document resource rendering', () => {
  it('keeps illustrations in their step, callouts in order and source text escaped', () => {
    const blocks: Block[] = [{ type: 'list', ordered: false, items: [{ blocks: [{ type: 'paragraph', inline: [{ text: 'Första <script>steget</script>', bold: true }] }, { type: 'image', asset: 'a', alt: 'Illustration' }] }, { blocks: [{ type: 'paragraph', inline: [{ text: 'Andra steget' }] }] }] }, { type: 'callout', tone: 'advice', blocks: [{ type: 'paragraph', inline: [{ text: 'Råd' }] }] }]
    const html = renderToStaticMarkup(<ResourceContent blocks={blocks} assets={{ a: '/image.png' }} />)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html.indexOf('/image.png')).toBeLessThan(html.indexOf('Andra steget'))
    expect(html).toContain('document-callout-advice')
    expect(html).toContain('alt="Illustration"')
  })
  it('renders both emergency columns and real telephone links', () => {
    const html = renderToStaticMarkup(<ResourceContent assets={{}} blocks={[{ type: 'columns', columns: [[{ type: 'callout', tone: 'emergency', blocks: [{ type: 'paragraph', inline: [{ text: '112', href: 'tel:112' }] }] }], [{ type: 'callout', tone: 'emergency', blocks: [{ type: 'paragraph', inline: [{ text: 'Skydd' }] }] }]] }]} />)
    expect(html).toContain('href="tel:112"')
    expect(html.match(/document-callout-emergency/g)).toHaveLength(2)
  })
  it('resolves internal targets and never executes arbitrary URLs', () => {
    const html = renderToStaticMarkup(<ResourceContent assets={{}} links={{ estrogen: '/faq/category#radiation.estrogen' }} blocks={[{ type: 'paragraph', inline: [{ text: 'Östrogen', target: 'estrogen' }, { text: 'Bad', href: 'javascript:alert(1)' }] }]} />)
    expect(html).toContain('href="/faq/category#radiation.estrogen"')
    expect(html).not.toContain('javascript:')
    expect(safeContentURL('//evil.example', true)).toBeUndefined()
    expect(safeContentURL('/faq/c#key', true)).toBe('/faq/c#key')
  })
  it('does not present a screenshot as a working player without a URL', () => {
    const html = renderToStaticMarkup(<ResourceContent assets={{ a: '/poster.png' }} review blocks={[{ type: 'video', asset: 'a', alt: '', url: '' }]} />)
    expect(html).toContain('videolänk saknas')
    expect(html).not.toContain('<video')
    expect(html).not.toContain('Öppna filmen')
  })
  it('shows an approved placeholder to patients, then a usable link when supplied', () => {
    const blocks: Block[] = [{ type: 'video', asset: 'a', alt: 'Film', placeholder: true, url: '' }]
    const html = renderToStaticMarkup(<ResourceContent assets={{ a: '/poster.png' }} blocks={blocks} />)
    expect(html).toContain('Film – länk kommer')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('<video')
    blocks[0] = { ...blocks[0], url: 'https://example.org/film' }
    const linked = renderToStaticMarkup(<ResourceContent assets={{ a: '/poster.png' }} blocks={blocks} />)
    expect(linked).toContain('href="https://example.org/film"')
    expect(linked).not.toContain('länk kommer')
  })
  it('renders the actual updated timing instructions for each arm and any diagnosis', () => {
    for (const key of ['dilator.timing', 'after-treatment.dilator-use']) {
      const content = parseContent(bundle.resources.find(r => r.sourceKey === key)!.content)!
      for (const diagnosis of ['anal', 'corpus', 'cervix']) {
        const pre = renderToStaticMarkup(<ResourceContent assets={{}} blocks={content.blocks} user={{ type: 'PRE', diagnosis }} />)
        const post = renderToStaticMarkup(<ResourceContent assets={{}} blocks={content.blocks} user={{ type: 'POST', diagnosis }} />)
        expect(pre).toContain('Fortsätt dagligen i 6 veckor')
        expect(post).not.toContain('Fortsätt dagligen i 6 veckor')
        expect(post).toContain('1 månad')
        expect(pre).not.toContain('1 månad')
      }
    }
    const after = bundle.collections.find(c => c.sourceKey === 'after-treatment')!
    for (const type of ['PRE', 'POST']) {
      expect(audienceMatches(parseContent(after.content)!.audience, { type, treatmentEnd: new Date('2000-01-01') })).toBe(true)
    }
  })
  it('rejects malformed blocks instead of reverting to obsolete HTML', () => {
    expect(() => parseContent({ schemaVersion: 1, audience: {}, blocks: [{ type: 'html', html: '<script />' }] })).toThrow()
  })
})

describe('audience and stable anchors', () => {
  const now = new Date('2026-09-24T12:00:00Z')
  it('distinguishes PRE after treatment from the POST arm and fails closed on missing dates', () => {
    const audience = { arms: ['PRE' as const], phases: ['after' as const] }
    const dates = { treatmentStart: new Date('2026-01-01'), treatmentEnd: new Date('2026-03-01') }
    expect(audienceMatches(audience, { type: 'PRE', ...dates }, now)).toBe(true)
    expect(audienceMatches(audience, { type: 'POST', ...dates }, now)).toBe(false)
    expect(audienceMatches(audience, { type: 'PRE' }, now)).toBe(false)
    expect(audienceMatches({ diagnoses: ['anal'] }, { diagnosis: 'corpus' }, now)).toBe(false)
    expect(audienceMatches({ phases: ['during'] }, { treatmentStart: new Date('2026-01-01') }, now)).toBe(false)
  })
  it('retains old title anchors after renames and refuses ambiguous aliases', () => {
    const items = [{ id: 'id', sourceKey: 'dilator.size', title: 'Ny rubrik', aliases: ['gammal-rubrik'] }]
    expect(resolveAnchor('gammal-rubrik', items)).toBe('dilator.size')
    expect(resolveAnchor('dilator.size', items)).toBe('dilator.size')
    expect(resolveAnchor('gammal-rubrik', [...items, { id: 'other', title: 'Gammal rubrik' }])).toBe('')
  })
})
