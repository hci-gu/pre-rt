import DOMPurify from 'dompurify'

// Temporary compatibility for resources not yet covered by the document.
// Apply after legacy audience substitutions and immediately before rendering.
export function sanitizeLegacyResourceHTML(html: string): string {
  if (!DOMPurify.isSupported) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'ol', 'ul', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption'],
    ALLOWED_ATTR: ['href', 'src', 'title', 'alt', 'width', 'height', 'start', 'class'],
    ADD_URI_SAFE_ATTR: ['width', 'height', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/(?!\/)|#)/i,
  })
}
