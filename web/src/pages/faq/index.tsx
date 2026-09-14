import { ResourceCollection } from '@/state'
import FaqCollections from '@/components/faq-collections'
import { Link } from 'react-router-dom'
import learnMoreWide from '@/assets/redesign/faq-categories/learn-more-card-wide--p83.svg'
import learnMoreSquare from '@/assets/redesign/faq-categories/learn-more-card-square--p89.svg'

const FaqTile = ({ collection }: { collection: ResourceCollection }) => (
  <Link
    to={`/faq/${collection.id}`}
    className="study-focus relative block aspect-[183/140] overflow-hidden rounded-xl bg-primary transition-transform hover:-translate-y-0.5 sm:aspect-[2.18/1]"
  >
    {collection.image && (
      <picture>
        {collection.imageCompact && (
          <source media="(max-width: 640px)" srcSet={collection.imageCompact} />
        )}
        <img
          src={collection.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
    )}
    <span className="absolute inset-x-3 top-3 text-left text-base font-black leading-tight text-foreground sm:inset-x-4 sm:top-4 sm:text-center sm:text-xl">
      {collection.name}
    </span>
  </Link>
)

export default function FaqPage() {
  return (
    <FaqCollections>{(collections) => (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-4xl font-black md:text-5xl">Frågor och svar</h1>
        <p className="max-w-xl text-lg font-bold leading-snug">
          Här hittar du frågor och svar kring sådant som berör sexuell hälsa
          kopplat till cancer och strålbehandling.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {collections.map((collection) => (
          <FaqTile key={collection.id} collection={collection} />
        ))}
        <Link
          to="/faq/mer"
          className="study-focus relative block aspect-[183/140] overflow-hidden rounded-xl bg-study-pink transition-transform hover:-translate-y-0.5 sm:aspect-[2.18/1]"
        >
          <picture>
            <source media="(max-width: 640px)" srcSet={learnMoreSquare} />
            <img
              src={learnMoreWide}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <span className="absolute inset-x-3 top-3 text-left text-base font-black leading-tight text-foreground sm:inset-x-4 sm:top-4 sm:text-center sm:text-xl">
            Om du vill veta mer
          </span>
        </Link>
      </div>
    </div>
    )}</FaqCollections>
  )
}
