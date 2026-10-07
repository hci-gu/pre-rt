import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

export function resourceReviewPlugin(): Plugin {
  return {
    name: 'local-resource-review',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__resource-review', async (req, res) => {
        const relative = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!/^(bundle\.json|review-report\.json|alt-text-drafts\.json|assets\/[a-f0-9]{64}\.png)$/.test(relative)) {
          res.statusCode = 404; res.end(); return
        }
        try {
          const directory = relative === 'alt-text-drafts.json' ? '../content/resources' : '../content/resources/generated'
          const file = await readFile(path.resolve(__dirname, directory, relative))
          res.setHeader('Content-Type', relative.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(file)
        } catch {
          if (relative === 'review-report.json') { res.setHeader('Content-Type', 'application/json'); res.end('null'); return }
          res.statusCode = 404; res.end('Run scripts/resources/resources.py extract first.')
        }
      })
    },
  }
}
