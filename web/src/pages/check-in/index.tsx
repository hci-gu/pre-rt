import { Link } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { studySettingsAtom, useAnswers, userDataAtom } from '@/state'
import { cn } from '@/lib/utils'
import { isSameDay } from '@/utils'
import registrationArtMobile from '@/assets/redesign/dashboard-cards/registration-card-square--p64.svg'
import registrationArt from '@/assets/redesign/dashboard-cards/registration-card-large-wide--p70.svg'
import calendarArtMobile from '@/assets/redesign/dashboard-cards/calendar-card-yellow-alt-wide--p75.svg'
import calendarArt from '@/assets/redesign/dashboard-cards/calendar-card-yellow-wide--p71.svg'
import cloudsArt from '@/assets/redesign/dashboard-cards/clouds-card-pink-wide--p72.svg'
import flagArtMobile from '@/assets/redesign/dashboard-cards/flag-card-blue-alt-wide--p77.svg'
import flagArt from '@/assets/redesign/dashboard-cards/flag-card-blue-wide--p73.svg'
import successIcon from '@/assets/redesign/status/success-check-circle--p55.svg'

type CheckInCardProps = {
  title: string
  href?: string
  art: string
  mobileArt?: string
  complete?: boolean
  badge?: string
  buttonLabel?: string
  titleClassName?: string
}

function CheckInCard({
  title,
  href,
  art,
  mobileArt,
  complete = false,
  badge,
  buttonLabel,
  titleClassName,
}: CheckInCardProps) {
  const hasBadge = Boolean(badge || buttonLabel)

  const content = (
    <article
      className={cn(
        'relative aspect-[350/268] overflow-hidden rounded-xl text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:aspect-[462/214] sm:text-center',
        !href && 'hover:translate-y-0'
      )}
    >
      <picture>
        <source media="(min-width: 640px)" srcSet={art} />
        <img
          src={mobileArt ?? art}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <div
        className={cn(
          'relative z-10 flex h-full flex-col items-start p-3 sm:items-center sm:p-4',
          hasBadge && 'justify-start gap-2 sm:justify-center sm:gap-3'
        )}
      >
        <h2
          className={cn(
            'max-w-[82%] text-sm font-black leading-tight text-foreground sm:text-xl sm:leading-none',
            complete && 'pr-8 sm:pr-0',
            titleClassName
          )}
        >
          {title}
        </h2>
        {(badge || buttonLabel) && (
          <span
            className={cn(
              'self-center rounded-full px-5 py-2 text-sm font-bold text-foreground sm:px-6 sm:text-base',
              buttonLabel ? 'bg-study-header' : 'bg-card/85'
            )}
          >
            {buttonLabel ?? badge}
          </span>
        )}
      </div>
      {complete && (
        <img
          src={successIcon}
          alt=""
          aria-hidden="true"
          className="absolute right-3 top-3 z-20 h-7 w-7 sm:right-4 sm:top-4 sm:h-8 sm:w-8"
        />
      )}
    </article>
  )

  if (!href) return content

  return (
    <Link to={href} className="study-focus block rounded-xl">
      {content}
    </Link>
  )
}

export default function CheckInPage() {
  const { dailyQuestionnaire, treatmentEndQuestionnaire } = useAtomValue(studySettingsAtom)
  const user = useAtomValue(userDataAtom)
  const dailyAnswers = useAnswers(dailyQuestionnaire)
  const treatmentEndAnswers = useAnswers(treatmentEndQuestionnaire)
  const treatmentStart = user?.treatmentStart
  const treatmentStartLabel = treatmentStart
    ? treatmentStart.toLocaleDateString('sv-SE')
    : 'Saknas'
  const dailyComplete = dailyAnswers.some((answer) =>
    isSameDay(new Date(answer.date), new Date())
  )
  const treatmentEndComplete = treatmentEndAnswers.length > 0

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-black leading-tight md:text-5xl">
          Här checkar du in!
        </h1>
        <div className="max-w-2xl space-y-4 text-lg font-semibold leading-snug">
          <p>
            Här kan både du och vi följa hur du mår under behandlingen. Det
            bästa är om du checkar in varje gång du använder staven.
          </p>
          <p>
            Här ser du också din startpunkt - den svarar du på i början av din
            behandling.
          </p>
        </div>
      </div>

      <section
        aria-label="Daglig check-in"
        className="grid grid-cols-2 gap-3 sm:gap-x-7 sm:gap-y-5"
      >
        <CheckInCard
          title="Fyll i formulär - idag"
          href={`/forms/${dailyQuestionnaire}`}
          mobileArt={registrationArtMobile}
          art={registrationArt}
          complete={dailyComplete}
          titleClassName="max-w-[78%]"
        />
        <CheckInCard
          title="Fyll i formulär - annan dag"
          href={`/forms/${dailyQuestionnaire}/history`}
          mobileArt={calendarArtMobile}
          art={calendarArt}
          titleClassName="max-w-[84%]"
        />
        <CheckInCard
          title="Startdatum strålbehandling:"
          art={cloudsArt}
          complete={Boolean(treatmentStart)}
          badge={treatmentStartLabel}
          titleClassName="max-w-[80%]"
        />
        <CheckInCard
          title="Slutdatum strålbehandling:"
          href={`/forms/${treatmentEndQuestionnaire}`}
          mobileArt={flagArtMobile}
          art={flagArt}
          complete={treatmentEndComplete}
          buttonLabel={treatmentEndComplete ? 'Svarat' : 'Svara'}
          titleClassName="max-w-[80%]"
        />
      </section>
    </div>
  )
}
