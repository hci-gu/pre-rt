import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { CustomDay, LargeCalendar } from '@/components/ui/calendar'
import {
  Answer,
  dailyQuestionnaireScheduleAtom,
  Questionnaire,
  questionnaireAtom,
  useAnswers,
  userDataAtom,
} from '@/state'
import { CheckIcon } from '@radix-ui/react-icons'
import { useAtomValue } from 'jotai'
import { startTransition, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dayStringFromDate, isSameDay, isWithinPeriod } from '@/utils'
import { DayProps } from 'react-day-picker'

const FormHistoryLoaded = ({
  questionnaire,
  answers,
  startDate,
  endDate,
  treatmentStart,
  treatmentEnd,
}: {
  questionnaire: Questionnaire
  answers: Answer[]
  startDate: Date | null
  endDate: Date | null
  treatmentStart?: Date
  treatmentEnd?: Date
}) => {
  const navigate = useNavigate()
  const now = new Date()

  return (
    <div className="px-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/forms">Formulär</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{questionnaire.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <p className="mt-4">
        <span className="text-sm">
          Dagliga formulär: <strong>{startDate?.toLocaleDateString()}</strong>{' '}
          {endDate && (
            <>
              till <strong>{endDate.toLocaleDateString()}</strong>
            </>
          )}
          <br></br>
          Behandling: <strong>{treatmentStart?.toLocaleDateString()}</strong>
          {treatmentEnd && (
            <>
              {' '}
              till <strong>{treatmentEnd.toLocaleDateString()}</strong>
            </>
          )}
        </span>
      </p>

      <LargeCalendar
        className="m-0 mt-8 p-0"
        disabled={{ after: new Date(), before: startDate ?? new Date() }}
        onDayRender={(props: DayProps) => {
          if (answers.some((a) => isSameDay(new Date(a.date), props.date))) {
            return (
              <CustomDay
                {...props}
                style={{
                  color: '#16a34a',
                  fontWeight: 'bold',
                  border: '2px solid #16a34a',
                }}
              >
                <span>
                  <CheckIcon className="w-4 h-4" />
                </span>
              </CustomDay>
            )
          }

          if (
            startDate != null &&
            startDate <= now &&
            isWithinPeriod(props.date, startDate ?? now, now)
          ) {
            return (
              <CustomDay {...props}>
                <Button
                  className="px-2 py-1 mt-1"
                  onClick={() =>
                    startTransition(() => {
                      navigate(
                        `/forms/${questionnaire.id}?date=${dayStringFromDate(
                          props.date
                        )}`
                      )
                    })
                  }
                >
                  svara
                </Button>
              </CustomDay>
            )
          }

          if (
            isSameDay(props.date, treatmentStart ?? null) ||
            isSameDay(props.date, treatmentEnd ?? null) ||
            isSameDay(props.date, startDate) ||
            isSameDay(props.date, endDate)
          ) {
            let text = <></>
            if (isSameDay(props.date, treatmentStart ?? null)) {
              text = (
                <>
                  Behandling<br></br>start
                </>
              )
            } else if (isSameDay(props.date, treatmentEnd ?? null)) {
              text = (
                <>
                  Behandling<br></br>slut
                </>
              )
            } else if (isSameDay(props.date, startDate)) {
              text = <>start</>
            } else if (isSameDay(props.date, endDate)) {
              text = <>Avslut</>
            }

            return (
              <CustomDay
                {...props}
                style={{
                  color: '#dc2626',
                  fontWeight: 'bold',
                }}
              >
                <span className="text-xs">{text}</span>
              </CustomDay>
            )
          }

          return <CustomDay {...props} />
        }}
      />
    </div>
  )
}

const FormHistoryPage = () => {
  const { id } = useParams()
  const userData = useAtomValue(userDataAtom)
  const questionnaire = useAtomValue(questionnaireAtom(id ?? ''))
  const answers = useAnswers(questionnaire.id ?? '')
  const schedule = useAtomValue(dailyQuestionnaireScheduleAtom)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormHistoryLoaded
        questionnaire={questionnaire}
        answers={answers}
        treatmentStart={userData?.treatmentStart}
        treatmentEnd={userData?.treatmentEnd}
        startDate={schedule.startDate}
        endDate={schedule.endDate}
      />
    </Suspense>
  )
}

export default FormHistoryPage
