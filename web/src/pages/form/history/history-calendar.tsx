import { type CSSProperties, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import type { Answer } from '@/state'
import { dayStringFromDate, isSameDay, isWithinPeriod } from '@/utils'
import './history-calendar.css'

export function eligibleHistoryDate(date: Date, start: Date | null, end: Date | null, now: Date) {
  const last = end && end < now ? end : now
  return Boolean(start && isWithinPeriod(date, start, last) && (start <= last || isSameDay(start, last)))
}

export default function HistoryCalendar({ questionnaireId, answers, startDate, endDate, treatmentStart, treatmentEnd }: {
  questionnaireId: string; answers: Answer[]; startDate: Date | null; endDate: Date | null;
  treatmentStart?: Date; treatmentEnd?: Date;
}) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const now = new Date()
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1, 12))
  const label = month.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })
  return (
    <section className="history-calendar mt-8" aria-label="Formulärhistorik">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" aria-label="Föregående månad" className="h-11 w-11 shrink-0 p-0" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeftIcon /></Button>
        <h2 className="min-w-0 text-center text-lg font-bold" aria-live="polite">{label}</h2>
        <Button variant="outline" aria-label="Nästa månad" className="h-11 w-11 shrink-0 p-0" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRightIcon /></Button>
      </div>
      <div className="history-weekdays" aria-hidden="true">{['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => <span key={day}>{day}</span>)}</div>
      <ol className="history-days" style={{ '--first-weekday': String((month.getDay() + 6) % 7 + 1) } as CSSProperties}>
        {days.map(date => {
          const key = dayStringFromDate(new Date(date))
          const answered = answers.some(answer => isSameDay(new Date(answer.date), date))
          const label = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
          const marker = isSameDay(date, treatmentStart ?? null) ? 'Behandlingsstart' : isSameDay(date, treatmentEnd ?? null) ? 'Behandlingsslut' : isSameDay(date, startDate) ? 'Formulärstart' : isSameDay(date, endDate) ? 'Formulärslut' : ''
          return <li key={key} className="history-day" data-date={key} aria-current={isSameDay(date, now) ? 'date' : undefined}>
            <div className="min-w-0">
              <time dateTime={key} className="font-bold"><span className="history-date-long">{date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}</span><span className="history-date-short">{date.getDate()}</span></time>
              {marker && <p className="text-xs [overflow-wrap:anywhere]">{marker}</p>}
            </div>
            {answered ? <span className="text-sm font-bold text-green-800">✓ Besvarat</span> : eligibleHistoryDate(date, startDate, endDate, now)
              ? <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal px-2 py-2"><Link aria-label={`Svara för ${label}`} to={`/forms/${questionnaireId}?date=${key}`}>Svara</Link></Button>
              : <span className="history-unavailable text-sm text-muted-foreground">Ej tillgängligt</span>}
          </li>
        })}
      </ol>
    </section>
  )
}
