import { Fragment, type ReactNode } from 'react'
import { audienceMatches, safeContentURL, type Block, type ContentUser, type Inline } from './model'
import './resource-content.css'

type Props = {
  blocks: Block[]
  assets: Record<string, string>
  links?: Record<string, string>
  user?: ContentUser
  review?: boolean
}

function InlineText({ nodes, links, review = false }: { nodes: Inline[]; links: Record<string, string>; review?: boolean }) {
  return nodes.map((node, index) => {
    let child: ReactNode = node.text
    if (node.bold) child = <strong>{child}</strong>
    if (node.italic) child = <em>{child}</em>
    if (node.underline) child = <u>{child}</u>
    const target = node.target ? links[node.target] : node.href
    const url = review && target && /^#[a-z0-9.-]+$/.test(target) ? target : safeContentURL(target, !!node.target)
    if (url) child = <a href={url}>{child}</a>
    return <Fragment key={index}>{child}</Fragment>
  })
}

export default function ResourceContent({ blocks, assets, links = {}, user = null, review = false }: Props) {
  const children = (blocks: Block[]) => <ResourceContent blocks={blocks} assets={assets} links={links} user={user} review={review} />
  return <div className="document-content">{blocks.map((block, index) => {
    const key = index
    switch (block.type) {
      case 'paragraph': return <p key={key}><InlineText nodes={block.inline} links={links} review={review} /></p>
      case 'subheading': return <h3 key={key}><InlineText nodes={block.inline} links={links} review={review} /></h3>
      case 'quote': return <blockquote key={key}><InlineText nodes={block.inline} links={links} review={review} /></blockquote>
      case 'linkButton': {
        const href = safeContentURL(block.href)
        const label = <InlineText nodes={block.inline} links={links} review={review} />
        return href ? <p key={key}><a className="document-link-button" href={href}>{label}</a></p>
          : <p key={key}>{label}{review && <small className="document-review-note">Länkmål saknas</small>}</p>
      }
      case 'list': {
        const Tag = block.ordered ? 'ol' : 'ul'
        return <Tag key={key} start={block.ordered ? block.start : undefined}>{block.items.map((item, i) => <li key={i}>{children(item.blocks)}</li>)}</Tag>
      }
      case 'callout': return <aside key={key} className={`document-callout document-callout-${block.tone}`}>{children(block.blocks)}</aside>
      case 'columns': return <div key={key} className="document-columns">{block.columns.map((col, i) => <div key={i}>{children(col)}</div>)}</div>
      case 'audienceGroup': return ((review && !user) || audienceMatches(block.audience, user)) ? <Fragment key={key}>{children(block.blocks)}</Fragment> : null
      case 'image':
      case 'video': {
        const src = assets[block.asset]
        const crop = block.crop || {}
        const width = 1 - (crop.l || 0) - (crop.r || 0)
        const height = 1 - (crop.t || 0) - (crop.b || 0)
        const hasCrop = Object.values(crop).some(Boolean) && width > 0 && height > 0
        const image = src && <div className={hasCrop ? 'document-image-crop' : undefined} style={hasCrop ? { aspectRatio: `${block.width || 1}/${block.height || 1}` } : undefined}>
          <img src={src} alt={block.alt} aria-hidden={block.decorative || undefined} loading="lazy"
            style={hasCrop ? { width: `${100 / width}%`, maxWidth: 'none', height: `${100 / height}%`, position: 'absolute', left: `${-(crop.l || 0) * 100 / width}%`, top: `${-(crop.t || 0) * 100 / height}%` } : undefined} />
        </div>
        const url = safeContentURL(block.url)
        return <figure key={key} style={{ width: block.width ? `${block.width}px` : undefined }}>
          {block.type === 'video' && url ? <a href={url} aria-label={block.alt || 'Öppna filmen'}>{image}<span className="document-video-link">Öppna filmen</span></a> : image}
          {!src && <span role="status">Bilden kunde inte laddas.</span>}
          {block.type === 'video' && !url && block.placeholder && <figcaption>Film – länk kommer</figcaption>}
          {review && block.type === 'video' && !url && !block.placeholder && <figcaption className="document-review-note">Skärmbild från dokumentet — videolänk saknas</figcaption>}
          {review && !block.alt && !block.decorative && <figcaption className="document-review-note">Alternativtext behöver granskas</figcaption>}
        </figure>
      }
    }
  })}</div>
}
