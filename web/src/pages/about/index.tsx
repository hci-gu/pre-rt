import { aboutCollectionAtom, readAboutPageAtom } from '@/state'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import ResourceAccordion from '@/components/resourceCollection'

function AboutPage() {
  const collection = useAtomValue(aboutCollectionAtom)
  const setRead = useSetAtom(readAboutPageAtom)
  useEffect(() => {
    if (collection) setRead(true)
  }, [collection, setRead])

  if (!collection) {
    return <p role="status">Det gick inte att hämta informationen om studien.</p>
  }

  return (
    <div className="space-y-7">
      <h1 className="text-2xl font-black leading-tight md:text-4xl">
        {collection.pageTitle || collection.name}
      </h1>
      <ResourceAccordion collection={collection} showHeader={false} />
    </div>
  )
}

export default AboutPage
