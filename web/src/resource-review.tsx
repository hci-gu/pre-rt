import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import ResourceContent from './components/resource-content'
import { audienceMatches, type Content, type ContentUser } from './components/resource-content/model'
import './resource-review.css'

type SourceIssue = { id: string; code: string; message: string; blocking: boolean; resource?: string; source?: { paragraph?: number } }
type Entry = { sourceKey: string; title?: string; name?: string; resources?: string[]; content: Content }
type Bundle = { bundleHash: string; sourceDocumentHash: string; resources: Entry[]; collections: Entry[]; assets: { key: string; path: string }[]; issues: SourceIssue[] }
// Standalone development entry point, like main.tsx; HMR disposes its root below.
// eslint-disable-next-line react-refresh/only-export-components
function Review() {
  const [bundle, setBundle] = useState<Bundle>()
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('all')
  const [audience, setAudience] = useState('source')
  const [phase, setPhase] = useState('after')
  const [report, setReport] = useState<{ compiledBundleHash: string; coverage?: { id: string; title: string; disposition: string; references: string[] }[]; issues?: SourceIssue[] }>()
  const [showIssues, setShowIssues] = useState(false)
  const [altDrafts, setAltDrafts] = useState<{ number: number; key: string; title: string; draftAlt: string; status: string }[]>([])
  useEffect(() => {
    fetch('/__resource-review/bundle.json').then(r => { if (!r.ok) throw Error('Run the resource extractor first.'); return r.json() }).then(setBundle).catch(e => setError(String(e)))
    fetch('/__resource-review/review-report.json').then(r => r.ok ? r.json() : null).then(setReport).catch(() => {})
    fetch('/__resource-review/alt-text-drafts.json').then(r => r.ok ? r.json() : null).then(d => setAltDrafts(d?.items || [])).catch(() => {})
  }, [])
  useEffect(() => {
    const onHash = () => setSelected('all')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    const key = window.location.hash.slice(1)
    if (key) document.getElementById(key)?.scrollIntoView({ block: 'start' })
  }, [selected, bundle])
  if (error) return <p role="alert">{error}</p>
  if (!bundle) return <p>Laddar dokumentet…</p>
  const assets = Object.fromEntries(bundle.assets.map(a => [a.key, '/__resource-review/' + a.path]))
  const links = Object.fromEntries([...bundle.collections, ...bundle.resources].map(e => [e.sourceKey, '#' + e.sourceKey]))
  const user: ContentUser = audience === 'source' ? null : { type: audience, treatmentStart: new Date(phase === 'before' ? '2099-01-01' : '2000-01-01'), treatmentEnd: new Date(phase === 'after' ? '2001-01-01' : '2099-02-01') }
  const currentReport = report?.compiledBundleHash === bundle.bundleHash ? report : undefined
  const issues = currentReport?.issues || bundle.issues
  const blockers = issues.filter(i => i.blocking)
  const pendingAlts = altDrafts.filter(d => d.status !== 'approved').length
  const visible = (entry: Entry) => audience === 'source' || audienceMatches(entry.content.audience, user)
  return <>
    <header className="review-header"><div><span className="review-eyebrow">PRE-RT · DOKUMENTGRANSKNING</span><h1>Resurser från Word</h1><p>Utkast för granskning. Text och illustrationer kommer från resources.docx.</p></div>
      <button onClick={() => setShowIssues(!showIssues)} aria-expanded={showIssues}>{blockers.length} granskningspunkter {showIssues ? '−' : '+'}</button>
    </header>
    <div className="review-controls">
      <label>Visa innehåll <select value={audience} onChange={e => setAudience(e.target.value)}><option value="source">Hela källdokumentet</option><option>PRE</option><option>POST</option></select></label>
      {audience !== 'source' && <label>Behandlingsfas <select value={phase} onChange={e => setPhase(e.target.value)}><option value="before">Före</option><option value="during">Under</option><option value="after">Efter</option></select></label>}
      <span>{bundle.resources.length} avsnitt · {bundle.assets.length} bilder · källversion {bundle.sourceDocumentHash.slice(0, 10)}</span>
    </div>
    {!!altDrafts.length && <details className="review-issues"><summary>Alternativtexter ({altDrafts.length}) – {pendingAlts ? `${pendingAlts} väntar på granskning` : 'godkända'}</summary><p>{pendingAlts ? 'Ogranskade förslag är inte importerade.' : 'Alternativtexterna är godkända och används i resurserna.'} Numreringen följer bildernas ordning i Word.</p><div className="review-alt-grid">{altDrafts.filter(d => assets[d.key]).map(d => <figure key={d.key}><img src={assets[d.key]} alt="" loading="lazy" /><figcaption><strong>{d.number}. {d.title}</strong><p>{d.draftAlt}</p></figcaption></figure>)}</div></details>}
    {showIssues && <section className="review-issues"><h2>Att granska före publicering</h2><p>Utkastet visar källtexten utan att försöka lösa medicinska eller redaktionella frågor. Publiceringskommandot stoppar vid olösta punkter.</p>
      {report && !currentReport && <p role="status">Databasrapporten avser en äldre extraktion. Skapa en ny plan och rapport för att granska aktuell täckning.</p>}
      <ol>{blockers.map((issue, i) => <li key={issue.id || i}><strong>{issue.code}</strong> — {issue.message} {issue.source?.paragraph !== undefined && <small>Stycke {issue.source.paragraph}</small>}</li>)}</ol>
      {currentReport?.coverage && <details><summary>Alla befintliga databasresurser ({currentReport.coverage.length})</summary><table><thead><tr><th>Resurs</th><th>Status</th><th>Användning</th></tr></thead><tbody>{currentReport.coverage.map(r => <tr key={r.id}><td>{r.title}<small>{r.id}</small></td><td>{r.disposition}</td><td>{r.references?.join(', ') || 'Ingen referens'}</td></tr>)}</tbody></table></details>}
    </section>}
    <div className="review-layout"><nav aria-label="Resurskategorier"><button className={selected === 'all' ? 'active' : ''} onClick={() => setSelected('all')}>Alla kategorier</button>{bundle.collections.map(c => <button key={c.sourceKey} className={selected === c.sourceKey ? 'active' : ''} onClick={() => setSelected(c.sourceKey)}>{c.name}<small>{c.resources?.length} avsnitt</small></button>)}</nav>
      <main>{bundle.collections.filter(c => (selected === 'all' || selected === c.sourceKey) && visible(c)).map(c => <section className="review-category" id={c.sourceKey} key={c.sourceKey}><h2>{c.name}</h2>
        <ResourceContent blocks={c.content.blocks} assets={assets} links={links} user={user} review />
        {c.resources?.map(key => bundle.resources.find(r => r.sourceKey === key)!).filter(visible).map(r => <article id={r.sourceKey} key={r.sourceKey}><h2>{r.title}</h2><ResourceContent blocks={r.content.blocks} assets={assets} links={links} user={user} review /></article>)}
        {!!c.content.footer?.length && <div className="review-footer"><ResourceContent blocks={c.content.footer} assets={assets} links={links} user={user} review /></div>}
      </section>)}</main>
    </div>
  </>
}
const root = createRoot(document.getElementById('root')!)
root.render(<Review />)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
