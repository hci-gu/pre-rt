import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import HistoryCalendar from './history-calendar'
import {
  Answer,
  dailyQuestionnaireScheduleAtom,
  Questionnaire,
  questionnaireAtom,
  useAnswers,
  userDataAtom,
} from '@/state'
import { useAtomValue } from 'jotai'
import { Suspense } from 'react'
import { useParams } from 'react-router-dom'

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

      <HistoryCalendar questionnaireId={questionnaire.id} answers={answers} startDate={startDate} endDate={endDate} treatmentStart={treatmentStart} treatmentEnd={treatmentEnd} />
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
