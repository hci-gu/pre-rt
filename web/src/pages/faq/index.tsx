import { PageBackLink } from '@/components/page-back-link'
import FaqCollections from '@/components/faq-collections'
import { StudyTaskCard } from '@/components/study-task-card'
import learnMoreWide from '@/assets/redesign/faq-categories/learn-more-card-wide--p83.svg'
import learnMoreSquare from '@/assets/redesign/faq-categories/learn-more-card-square--p89.svg'

export default function FaqPage() {
  return (
    <FaqCollections>{(collections) => (
      <div className="space-y-7">
        <div className="space-y-2">
          <h1 className="text-3xl font-black md:text-4xl">Frågor och svar</h1>
          <p className="max-w-xl text-lg font-bold leading-snug">
            Här hittar du frågor och svar kring sådant som berör sexuell hälsa
            kopplat till cancer och strålbehandling.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5">
          {collections.map((collection) => (
            <StudyTaskCard
              key={collection.id}
              title={collection.name}
              href={`/faq/${collection.id}`}
              illustration={collection.imageCompact || collection.image}
              desktopIllustration={collection.image}
            />
          ))}
          <StudyTaskCard
            title="Om du vill veta mer"
            href="/faq/mer"
            illustration={learnMoreSquare}
            desktopIllustration={learnMoreWide}
          />
        </div>
        <PageBackLink />
      </div>
    )}</FaqCollections>
  )
}
