import { sanitizeLegacyResourceHTML } from '@/components/resource-content/legacy-html'

// Imported sections mix titles, empty paragraphs and whole paragraphs marked
// as headings/bold. Normalize presentation without editing questionnaire text.
export function sectionContent(html: string) {
  const body = new DOMParser().parseFromString(sanitizeLegacyResourceHTML(html), 'text/html').body
  for (const element of [...body.querySelectorAll('*')].reverse()) {
    element.removeAttribute('class')
    if (!element.textContent?.trim() && !element.querySelector('img') && !['IMG', 'BR'].includes(element.tagName)) {
      element.remove()
    }
  }

  const first = [...body.childNodes].find(node => node.textContent?.trim())
  const firstText = first?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  // Long introductory paragraphs (including PCL) are body copy, not titles.
  const hasTitle = firstText.length > 0 && firstText.length <= 90
  const title = hasTitle ? firstText : 'Information'
  if (hasTitle) first?.remove()

  for (const heading of body.querySelectorAll('h1,h2,h3,h4')) {
    const paragraph = body.ownerDocument.createElement('p')
    paragraph.append(...heading.childNodes)
    heading.replaceWith(paragraph)
  }
  for (const bold of body.querySelectorAll('strong,b')) {
    if (bold.parentElement?.textContent?.trim() === bold.textContent?.trim()) {
      bold.replaceWith(...bold.childNodes)
    }
  }
  return { title, body: body.innerHTML }
}
