import { useAtomValue } from 'jotai'
import { afterTreatmentCollectionAtom, userDataAtom } from '@/state'
import ResourceAccordion from '@/components/resourceCollection'
import { audienceMatches } from '@/components/resource-content/model'

export default function AfterTreatmentPage() {
  const collection = useAtomValue(afterTreatmentCollectionAtom)
  const user = useAtomValue(userDataAtom)
  const eligible = collection && audienceMatches(collection.content?.audience, user)
  return <div className="space-y-7">
    <h1 className="text-2xl font-black leading-tight md:text-4xl">Efter strålbehandlingen</h1>
    {eligible ? <ResourceAccordion collection={collection} showHeader={false} /> : <p role="status">Ingen information efter behandlingen är tillgänglig för dig ännu.</p>}
  </div>
}
