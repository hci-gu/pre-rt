import { useAtomValue } from 'jotai'
import { resourceAssetsAtom, userDataAtom } from '@/state'
import ResourceContent from '.'
import { audienceMatches, type Bindings, type Content } from './model'

export default function ConnectedResourceContent({ content, bindings, footer = false }: { content: Content; bindings?: Bindings; footer?: boolean }) {
  const assets = useAtomValue(resourceAssetsAtom)
  const user = useAtomValue(userDataAtom)
  if (!audienceMatches(content.audience, user)) return null
  return <ResourceContent blocks={footer ? content.footer || [] : content.blocks} assets={assets} links={bindings?.links} user={user} />
}
