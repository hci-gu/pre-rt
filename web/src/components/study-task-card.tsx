import { Link } from 'react-router-dom'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import successIcon from '@/assets/redesign/status/success-check-circle--p55.svg'

type StudyTaskCardProps = {
  title: string
  description?: string
  status?: string
  illustration: string
  desktopIllustration?: string
  titleClassName?: string
  complete?: boolean
  disabled?: boolean
  href?: string
  action?: ReactNode
}

export function StudyTaskCard({
  title,
  description,
  status,
  illustration,
  desktopIllustration,
  titleClassName,
  complete = false,
  disabled = false,
  href,
  action,
}: StudyTaskCardProps) {
  const content = (
    <article
      className={cn(
        'relative grid aspect-[350/268] overflow-hidden rounded-xl text-left shadow-sm transition sm:aspect-[462/214] sm:text-center',
        href &&
          !disabled &&
          'hover:-translate-y-0.5 hover:shadow-md focus-within:shadow-md'
      )}
    >
      <picture>
        {desktopIllustration && (
          <source media="(min-width: 640px)" srcSet={desktopIllustration} />
        )}
        <img
          src={illustration}
          alt=""
          aria-hidden="true"
          className="absolute -inset-0.5 h-[calc(100%+0.25rem)] w-[calc(100%+0.25rem)] max-w-none object-cover"
        />
      </picture>

      {complete && (
        <span className="absolute right-3 top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8">
          <img
            src={successIcon}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 sm:h-8 sm:w-8"
          />
          <span className="sr-only">Klar</span>
        </span>
      )}

      <div className="relative z-10 flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5">
        <div className="space-y-2">
          <h2
            className={cn(
              'max-w-[72%] text-lg font-black leading-none text-foreground [overflow-wrap:anywhere] sm:mx-auto sm:text-xl',
              titleClassName
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="max-w-[62%] text-sm font-semibold leading-snug text-foreground/80">
              {description}
            </p>
          )}
        </div>
        {status && (
          <p className="w-fit rounded-full bg-card/80 px-3 py-1 text-xs font-extrabold text-foreground">
            {status}
          </p>
        )}
        {action}
      </div>
    </article>
  )

  if (!href || disabled) {
    return content
  }

  return (
    <Link to={href} aria-label={title} className="study-focus block rounded-xl">
      {content}
    </Link>
  )
}
