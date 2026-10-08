import { PageBackLink } from '@/components/page-back-link'
import ResourceAccordion from '@/components/resourceCollection'
import FaqCollections from '@/components/faq-collections'

export default function FaqMorePage() {
  return (
    <FaqCollections>{(collections) => (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-black md:text-4xl">Om du vill veta mer</h1>
        <p className="max-w-xl text-lg font-bold leading-snug">
          Här finns alla frågor och svar samlade från de olika kategorierna.
        </p>
      </div>
      <div className="space-y-8">
        {collections.map((collection) => (
          <ResourceAccordion key={collection.id} collection={collection} />
        ))}
      </div>
      <PageBackLink to="/faq">Tillbaka till frågor och svar</PageBackLink>
    </div>
    )}</FaqCollections>
  )
}
