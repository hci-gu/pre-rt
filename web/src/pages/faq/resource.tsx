import ResourceAccordion from '@/components/resourceCollection'
import { resourceCollectionAtom } from '@/state'
import { useAtomValue } from 'jotai'
import { useParams } from 'react-router-dom'

export default function FaqResourcePage() {
  const { collectionId } = useParams()
  const collection = useAtomValue(resourceCollectionAtom(collectionId ?? ''))

  if (!collection) {
    return <p role="status">Det gick inte att hämta kategorin.</p>
  }

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-black md:text-4xl">
          {collection.pageTitle || collection.name}
        </h1>
      </div>
      <ResourceAccordion collection={collection} showHeader={false} />
      {collection.footerContent && (
        <div
          className="resource-content"
          dangerouslySetInnerHTML={{ __html: collection.footerContent }}
        />
      )}
    </div>
  )
}
