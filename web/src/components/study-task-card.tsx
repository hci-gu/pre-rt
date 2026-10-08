import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import successIcon from '@/assets/redesign/status/success-check-circle--p55.svg'

type StudyTaskCardProps = {
  title: string
  illustration?: string
  desktopIllustration?: string
  complete?: boolean
  href?: string
}

export function StudyTaskCard({
  title,
  illustration,
  desktopIllustration,
  complete = false,
  href,
}: StudyTaskCardProps) {
  const content = (
    <article
      className={cn(
        'relative aspect-[183/140] overflow-hidden rounded-xl bg-primary sm:aspect-[2.18/1]',
        href && 'transition-transform hover:-translate-y-0.5'
      )}
    >
      {(illustration || desktopIllustration) && (
        <picture>
          {desktopIllustration && (
            <source media="(min-width: 640px)" srcSet={desktopIllustration} />
          )}
          <img
            src={illustration || desktopIllustration}
            alt=""
            aria-hidden="true"
            className="absolute -inset-0.5 h-[calc(100%+0.25rem)] w-[calc(100%+0.25rem)] max-w-none object-cover"
          />
        </picture>
      )}

      <h2
        className={cn(
          'absolute inset-x-3 top-3 text-left text-base font-black leading-tight text-foreground [overflow-wrap:anywhere] sm:inset-x-4 sm:top-4 sm:text-center sm:text-xl',
          complete && 'right-12 sm:inset-x-14'
        )}
      >
        {title}
      </h2>

      {complete && (
        <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center sm:h-8 sm:w-8">
          <img src={successIcon} alt="" aria-hidden="true" className="h-full w-full" />
          <span className="sr-only">Klar</span>
        </span>
      )}
    </article>
  )

  return href ? (
    <Link to={href} aria-label={title} className="study-focus block rounded-xl">
      {content}
    </Link>
  ) : content
}
