import { Button } from '@/components/ui/button'
import ResourceAccordion from '@/components/resourceCollection'
import FaqCollections from '@/components/faq-collections'
import { Link } from 'react-router-dom'

export default function FaqMorePage() {
  return (
    <FaqCollections>{(collections) => (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-4xl font-black md:text-5xl">Om du vill veta mer</h1>
        <p className="max-w-xl text-lg font-bold leading-snug">
          Här finns alla frågor och svar samlade från de olika kategorierna.
        </p>
      </div>
      <div className="space-y-8">
        {collections.map((collection) => (
          <ResourceAccordion key={collection.id} collection={collection} />
        ))}
      </div>
      <Button asChild variant="secondary">
        <Link to="/faq">Tillbaka till frågor och svar</Link>
      </Button>
    </div>
    )}</FaqCollections>
  )
}
