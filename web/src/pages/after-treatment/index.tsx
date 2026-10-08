import { PageBackLink } from '@/components/page-back-link'
import { useAtomValue } from 'jotai'
import { afterTreatmentCollectionAtom, userDataAtom } from '@/state'
import ResourceAccordion from '@/components/resourceCollection'
import { audienceMatches } from '@/components/resource-content/model'

export default function AfterTreatmentPage() {
  const collection = useAtomValue(afterTreatmentCollectionAtom)
  const user = useAtomValue(userDataAtom)
  const eligible = collection && audienceMatches(collection.content?.audience, user)
  return <div className="space-y-7">
    <h1 className="text-2xl font-black leading-tight [overflow-wrap:anywhere]">Efter strålbehandlingen</h1>
    {eligible && <p>Du kan läsa informationen här redan före behandlingens slut. Följ de tidpunkter som anges i instruktionerna för dig.</p>}
    {eligible ? <ResourceAccordion collection={collection} showHeader={false} /> : <p role="status">Ingen information efter behandlingen är tillgänglig för dig ännu.</p>}
    <PageBackLink />
  </div>
}
