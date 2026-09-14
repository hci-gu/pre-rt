// Migrate the former frontend FAQ overrides into actual PocketBase records.
// Dry run by default. See scripts/README.md for local usage.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const api = new URL(process.env.PB_URL || 'http://127.0.0.1:8090')
if (!['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
  throw new Error('This content seed is restricted to local PocketBase instances.')
}
const token = process.env.PB_SUPERUSER_TOKEN
if (!token) throw new Error('Set PB_SUPERUSER_TOKEN to a local superuser token.')
const apply = process.argv.includes('--apply')
const root = new URL('../', import.meta.url)
const backend = new URL('../../pocketbase/', import.meta.url)

async function request(path, method = 'GET', body) {
  const form = body instanceof FormData
  const response = await fetch(new URL(path, api), {
    method,
    headers: {
      Authorization: token,
      ...(!form && body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
    redirect: 'error',
  })
  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  }
  return response.status === 204 ? undefined : response.json()
}

async function list(collection) {
  const records = []
  for (let page = 1; ; page++) {
    const result = await request(`/api/collections/${collection}/records?perPage=500&page=${page}`)
    records.push(...result.items)
    if (page >= result.totalPages) return records
  }
}

const [resources, collections, schema, fields] = await Promise.all([
  list('resource'),
  list('resourceCollection'),
  request('/api/collections/resourceCollection'),
  readFile(new URL('migrations/faq_collection_fields.json', backend), 'utf8').then(JSON.parse),
])
const byId = new Map(resources.map((resource) => [resource.id, resource]))
const collectionsById = new Map(collections.map((collection) => [collection.id, collection]))
const asset = async (name) => readFile(new URL(`src/assets/redesign/${name}.svg`, root))
const image = async (name, alt = '') =>
  `<img src="data:image/svg+xml;base64,${(await asset(name)).toString('base64')}" alt="${alt}">`
const picture = async (wide, compact, alt = '') =>
  `<picture><source media="(min-width: 640px)" srcset="data:image/svg+xml;base64,${(await asset(wide)).toString('base64')}">${await image(compact, alt)}</picture>`
const required = (id) => {
  const record = byId.get(id)
  if (!record) throw new Error(`Required source resource missing: ${id}`)
  return record
}

const updates = new Map()
function update(id, fields) {
  required(id)
  updates.set(id, { ...updates.get(id), ...fields })
}

// Preserve existing clinical descriptions, including PRE/POST sections.
for (const [id, title] of [
  ['8vegqnt3c9mpnu7', 'Varför ska jag använda vaginalstav?'],
  ['4mv1csl1xq95j2w', 'Hur gör jag när jag använder vaginalstav?'],
  ['v6uaw2lwupb43k1', 'Hur mäter jag längden på staven?'],
  ['2m43w22dg11hw9x', 'Vad är sexuell hälsa?'],
  ['i0y07b2txpy01z0', 'Hur påverkas sexualiteten av behandlingen?'],
  ['sg7r3u1z24c50y9', 'Hur påverkas min sexuella hälsa av behandlingen?'],
  ['8507djoit323dac', 'Hur sköter jag bäst min intimvård?'],
]) update(id, { title })

const marker = '<!-- faq-illustrations -->'
for (const [id, html] of [
  ['4mv1csl1xq95j2w', `<div class="resource-gallery">${(await Promise.all([
    image('medical/dilator-insertion-position--p18'),
    image('medical/dilator-insertion-arrow--p19'),
    image('medical/dilator-insertion-duration--p20'),
  ])).join('')}</div>`],
  ['540wnc1pz0k7v44', await image('medical/dilator-size-comparison-wide--p21', 'Illustration som jämför vaginalstavarnas storlekar.')],
  ['v6uaw2lwupb43k1', await picture('medical/dilator-length-measurement-wide--p27', 'medical/dilator-length-measurement-compact--p28', 'Illustration som visar hur vaginalstavens längd mäts.')],
]) {
  const record = required(id)
  if (!record.description.includes(marker)) {
    update(id, { description: `${record.description}\n${marker}\n${html}` })
  }
}

// Reuse the timing instructions already stored in PocketBase. The former
// frontend timeline contradicted these instructions and ignored user type.
const how = required('4mv1csl1xq95j2w').description
const timingParagraphs = (how.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
  .filter((paragraph) =>
    /&lt;(?:pre|post)&gt;|<(?:pre|post)>|2-3 &aring;r/.test(paragraph)
  )
if (timingParagraphs.length < 2) throw new Error('Cannot locate existing PRE/POST timing instructions.')

const newResources = [
  {
    id: 'faq000000000001',
    title: 'När ska jag göra terapin?',
    description: timingParagraphs.join('\n'),
  },
  {
    id: 'faq000000000002',
    title: 'Är det normalt med smärta och obehag?',
    description: `${required('971931xhdhac75z').description}\n${required('0mo0p6jq95s71k0').description}`,
  },
  {
    id: 'faq000000000003',
    title: 'Hur gör jag om jag får blåsor eller sår?',
    description: '<p>Kontakta vården om du får blåsor, sår eller besvär som inte går över.</p>',
  },
  {
    id: 'faq000000000004',
    title: 'Kan jag raka könshåret?',
    description: '<p>Var försiktig med rakning om huden är irriterad. Undvik att raka över sår eller öm hud.</p>',
  },
]

const categoryData = [
  ['85071a5innq3o43', 'Strålbehandling och biverkningar', 'radiation-effects-wave-card-wide--p78', 'radiation-effects-wave-card-square--p84'],
  ['1ei3zjui10q8q91', 'Användning av vaginalstav', 'vaginal-dilator-card-wide--p79', 'vaginal-dilator-card-square--p85'],
  ['94ze51rc8dz5oh6', 'Frågor om sexuell hälsa', 'sexual-health-card-wide--p80', 'sexual-health-card-square--p86'],
  ['23s6oyiql5gc9qi', 'Frågor om intimvård', 'intimate-care-card-wide--p81', 'intimate-care-card-square--p87'],
  ['7d5griw67n84z36', 'Våld', 'violence-card-wide--p82', 'violence-card-square--p88'],
]
const categoryUpdates = []
for (const [index, [id, pageTitle, wide, compact]] of categoryData.entries()) {
  const record = collectionsById.get(id)
  if (!record) throw new Error(`Required resource collection missing: ${id}`)
  const changes = { pageTitle, sort: (index + 1) * 10 }
  if (id === '1ei3zjui10q8q91') {
    // Retain unrelated relations; keep the separate pain/discomfort records
    // available to questionnaire help while grouping them in this FAQ.
    const managed = ['8vegqnt3c9mpnu7', '4mv1csl1xq95j2w', 'faq000000000001', '540wnc1pz0k7v44', 'v6uaw2lwupb43k1', 'faq000000000002']
    changes.resources = [...managed, ...record.resources.filter((resourceId) =>
      ![...managed, '971931xhdhac75z', '0mo0p6jq95s71k0'].includes(resourceId)
    )]
  }
  if (id === '23s6oyiql5gc9qi') {
    changes.resources = [...new Set([...record.resources, 'faq000000000003', 'faq000000000004'])]
  }
  if (!record.footerContent && ['94ze51rc8dz5oh6', '23s6oyiql5gc9qi'].includes(id)) {
    changes.footerContent = id === '94ze51rc8dz5oh6'
      ? await picture('faq-categories/sexual-health-body-card-wide--p53', 'faq-categories/sexual-health-body-card-compact--p54')
      : await picture('faq-categories/intimate-care-category-card-wide--p51', 'faq-categories/intimate-care-category-card-compact--p52')
  }
  if (id === '7d5griw67n84z36') changes.showQuickExit = true
  const files = []
  for (const [field, name] of [['image', wide], ['imageCompact', compact]]) {
    if (!record[field]) files.push({ field, name: `${name}.svg`, bytes: await asset(`faq-categories/${name}`) })
  }
  categoryUpdates.push({ id, changes, files })
}

const missingFields = fields.filter((field) => !schema.fields.some((existing) => existing.name === field.name))
const creates = newResources.filter((resource) => !byId.has(resource.id))
console.log(JSON.stringify({
  mode: apply ? 'apply' : 'dry-run',
  api: api.origin,
  fieldsToAdd: missingFields.map((field) => field.name),
  resourcesToCreate: creates.map(({ id, title }) => ({ id, title })),
  resourcesToUpdate: [...updates.keys()],
  collectionsToUpdate: categoryUpdates.map(({ id }) => id),
}, null, 2))
if (!apply) process.exit(0)

// Preserve original content and schema before any writes. Existing images
// are never replaced, and no records are deleted.
const backupDirectory = new URL('pb_data/faq-backups/', backend)
await mkdir(backupDirectory, { recursive: true })
const backup = new URL(`${new Date().toISOString().replaceAll(':', '-')}.json`, backupDirectory)
await writeFile(backup, JSON.stringify({ schema, resources, collections }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`Backup: ${fileURLToPath(backup)}`)

if (missingFields.length) {
  await request('/api/collections/resourceCollection', 'PATCH', { fields: [...schema.fields, ...missingFields] })
}
for (const resource of creates) {
  await request('/api/collections/resource/records', 'POST', resource)
}
for (const [id, changes] of updates) {
  await request(`/api/collections/resource/records/${id}`, 'PATCH', changes)
}
for (const { id, changes, files } of categoryUpdates) {
  const form = new FormData()
  for (const [field, value] of Object.entries(changes)) {
    form.append(field, typeof value === 'string' ? value : JSON.stringify(value))
  }
  for (const { field, name, bytes } of files) {
    form.append(field, new Blob([bytes], { type: 'image/svg+xml' }), name)
  }
  await request(`/api/collections/resourceCollection/records/${id}`, 'PATCH', form)
}
console.log('FAQ resources, collection relations and artwork saved.')
