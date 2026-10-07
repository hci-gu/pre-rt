import { z } from 'zod'

export type Audience = { arms?: ('PRE' | 'POST')[]; phases?: ('before' | 'during' | 'after')[]; diagnoses?: string[] }
export type ContentUser = { type?: string; diagnosis?: string; treatmentStart?: Date; treatmentEnd?: Date } | null
export type Inline = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string; target?: string }
export type Block =
  | { type: 'paragraph' | 'subheading' | 'quote'; inline: Inline[] }
  | { type: 'linkButton'; inline: Inline[]; href?: string }
  | { type: 'list'; ordered: boolean; start?: number; items: { blocks: Block[] }[] }
  | { type: 'image' | 'video'; asset: string; alt: string; decorative?: boolean; width?: number; height?: number; crop?: { l?: number; r?: number; t?: number; b?: number }; url?: string; placeholder?: boolean }
  | { type: 'callout'; tone: 'advice' | 'emergency'; blocks: Block[] }
  | { type: 'columns'; columns: Block[][] }
  | { type: 'audienceGroup'; audience: Audience; blocks: Block[] }
export type Content = { schemaVersion: 1; audience: Audience; blocks: Block[]; footer?: Block[] }
export type Bindings = { links?: Record<string, string> }

const audienceSchema = z.object({
  arms: z.array(z.enum(['PRE', 'POST'])).nonempty().optional(),
  phases: z.array(z.enum(['before', 'during', 'after'])).nonempty().optional(),
  diagnoses: z.array(z.string()).nonempty().optional(),
}).strict()
const inlineSchema = z.object({ text: z.string(), bold: z.boolean().optional(), italic: z.boolean().optional(), underline: z.boolean().optional(), href: z.string().optional(), target: z.string().optional() })
const blockSchema: z.ZodType<Block> = z.lazy(() => z.discriminatedUnion('type', [
  z.object({ type: z.enum(['paragraph', 'subheading', 'quote', 'linkButton']), inline: z.array(inlineSchema), href: z.string().optional() }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), start: z.number().optional(), items: z.array(z.object({ blocks: z.array(blockSchema) })) }),
  z.object({ type: z.enum(['image', 'video']), asset: z.string(), alt: z.string(), decorative: z.boolean().optional(), width: z.number().optional(), height: z.number().optional(), crop: z.object({ l: z.number().optional(), r: z.number().optional(), t: z.number().optional(), b: z.number().optional() }).optional(), url: z.string().optional(), placeholder: z.boolean().optional() }),
  z.object({ type: z.literal('callout'), tone: z.enum(['advice', 'emergency']), blocks: z.array(blockSchema) }),
  z.object({ type: z.literal('columns'), columns: z.array(z.array(blockSchema)) }),
  z.object({ type: z.literal('audienceGroup'), audience: audienceSchema, blocks: z.array(blockSchema) }),
]))
export const contentSchema: z.ZodType<Content> = z.object({ schemaVersion: z.literal(1), audience: audienceSchema, blocks: z.array(blockSchema), footer: z.array(blockSchema).optional() })

export function parseContent(value: unknown): Content | undefined {
  if (!value) return undefined
  return contentSchema.parse(value) // Do not silently render stale HTML on malformed imported content.
}

export function audienceMatches(audience: Audience | undefined, user: ContentUser, now = new Date()): boolean {
  if (!audience) return true
  if (audience.arms && (!user?.type || !audience.arms.includes(user.type as 'PRE' | 'POST'))) return false
  if (audience.diagnoses && (!user?.diagnosis || !audience.diagnoses.includes(user.diagnosis))) return false
  if (audience.phases) {
    const start = user?.treatmentStart ? new Date(user.treatmentStart).setHours(0, 0, 0, 0) : undefined
    const end = user?.treatmentEnd ? new Date(user.treatmentEnd).setHours(23, 59, 59, 999) : undefined
    const time = now.getTime()
    if (start !== undefined && end !== undefined && start > end) return false
    const phase = end !== undefined && Number.isFinite(end) && time > end ? 'after'
      : start !== undefined && Number.isFinite(start) && time < start ? 'before'
      : start !== undefined && end !== undefined && Number.isFinite(start) && Number.isFinite(end) && time >= start && time <= end ? 'during' : undefined
    if (!phase || !audience.phases.includes(phase)) return false
  }
  return true
}

export function safeContentURL(url: string | undefined, internal = false): string | undefined {
  if (!url || [...url].some(char => char.charCodeAt(0) < 32)) return undefined
  if (internal && /^\/(faq\/[^/?#]+|after-treatment|about)(#[a-z0-9.-]+)?$/.test(url)) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return url
    if (/^tel:[+0-9 ()-]+$/.test(url) || /^mailto:[^\s?]+@[^\s?]+$/.test(url)) return url
  } catch { /* Invalid content URLs render as text. */ }
  return undefined
}

export const titleToSlug = (title: string) => title.toLowerCase()
  .replace(/[åäàáâãæ]/g, 'a').replace(/[öòóôõø]/g, 'o')
  .replace(/[^a-z0-9-\s]/g, '').replace(/-+/g, '').replace(/\s+/g, '-').trim()
export const resourceAnchor = (resource: { id: string; sourceKey?: string }) => resource.sourceKey || resource.id
export function resolveAnchor(hash: string, resources: { id: string; title: string; sourceKey?: string; aliases?: string[] }[]): string {
  const exact = resources.find(r => resourceAnchor(r) === hash)
  if (exact) return resourceAnchor(exact)
  const aliases = resources.filter(r => r.aliases?.includes(hash) || titleToSlug(r.title) === hash)
  return aliases.length === 1 ? resourceAnchor(aliases[0]) : '' // Ambiguous historical titles cannot pick an arbitrary answer.
}
