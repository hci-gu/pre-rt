import { type ReactNode, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { motion, interpolate } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import {
  answersForQuestionnaireAtom,
  authAtom,
  Questionnaire,
  questionnaireAtom,
  submitQuestionnaire,
  studySettingsAtom,
  dailyQuestionnaireScheduleAtom,
} from '@/state'
import QuestionSelector from './components/QuestionSelector'
import { Form } from '@/components/ui/form'
import { type FieldValues, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PinBottomIcon,
  UpdateIcon,
} from '@radix-ui/react-icons'
import { useToast } from '@/hooks/use-toast'
import useQuestions from './hooks/useQuestions'
import { prepareSubmission } from './answers'
import { answeredUpTo, canProceedAtom, formPageAtom } from './state'
import { questionnaireAnswered } from '@/utils'
import useFormStateWithCache, {
  keyForQuestionnaire,
  useQuestionnaireDraftKey,
  questionnaireDate,
  SyncFormStateToLocalStorage,
  useScrollToLastAnsweredQuestion,
} from './hooks/useFormState'
import QuestionNavigationList from './components/QuestionNavigationList'
import AdaptiveQuestionPanel from './components/AdaptiveQuestionPanel'
import useVisualViewport from './hooks/useVisualViewport'
import TreatmentEndForm from './components/TreatmentEndForm'
import { QuestionnaireQuickExit, QuestionnaireSafetyProvider, useQuestionnaireSafety } from './questionnaire-safety'
import { eligibleHistoryDate } from './history/history-calendar'
import './questionnaire.css'
import { readQuestionnaireDraft } from '@/lib/questionnaire-drafts'

const ProgressBar = ({ questionnaire }: { questionnaire: Questionnaire }) => {
  const questions = useQuestions(questionnaire)
  const page = useAtomValue(formPageAtom)
  const totalQuestions = questions.filter(
    (q) => q.type !== 'section' && q.type !== 'text'
  ).length
  const currentQuestionNumber = questions
    .slice(0, Math.max(page + 1, 0))
    .filter((q) => q.type !== 'section' && q.type !== 'text').length
  const scaleX = interpolate([0, Math.max(totalQuestions - 1, 1)], [0.01, 1])
  const showProgress = page >= 0

  return showProgress ? (
    <div className="questionnaire-progress">
      <span className="text-base font-black" data-testid="questionnaire-progress" aria-label="Framsteg">
        {Math.min(Math.max(currentQuestionNumber, 1), totalQuestions)}/{totalQuestions}
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary"
        data-testid="questionnaire-progress-bar" role="progressbar" aria-label="Framsteg"
        aria-valuemin={0} aria-valuemax={totalQuestions}
        aria-valuenow={Math.min(currentQuestionNumber, totalQuestions)}>
        <motion.div className="h-full rounded-full bg-study-teal-dark"
          animate={{ scaleX: scaleX(Math.max(currentQuestionNumber - 1, 0)) }}
          transition={{ duration: 0.2 }} style={{ originX: 0 }} />
      </div>
    </div>
  ) : null
}

const NavigationButtons = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  const questions = useQuestions(questionnaire)
  const [page, setPage] = useAtom(formPageAtom)
  const answers = useWatch()
  const canScrollUpTo = useAtomValue(
    answeredUpTo({
      questions,
      answers,
    })
  )
  const canProceed = useAtomValue(
    canProceedAtom({
      questions,
      answers,
    })
  )

  return (
    <div className="questionnaire-navigation">
      <Button
        className="h-9 w-9 rounded-lg bg-study-coral p-0 text-white shadow-md hover:bg-study-coral/90"
        disabled={page === 0}
        aria-label="Föregående fråga"
        data-testid="questionnaire-previous"
        onClick={(e) => {
          e.preventDefault()
          setPage(page - 1)
        }}
      >
        <ChevronUpIcon />
      </Button>
      <Button
        className="h-9 w-9 rounded-lg bg-study-coral p-0 text-white shadow-md hover:bg-study-coral/90"
        disabled={!canProceed}
        aria-label="Nästa fråga"
        data-testid="questionnaire-next"
        onClick={(e) => {
          e.preventDefault()
          setPage(page + 1)
        }}
      >
        <ChevronDownIcon />
      </Button>
      <Button
        className="h-9 w-9 rounded-lg bg-study-coral p-0 text-white shadow-md hover:bg-study-coral/90"
        disabled={!canProceed}
        aria-label="Sista obesvarade frågan"
        data-testid="questionnaire-last"
        onClick={(e) => {
          e.preventDefault()
          setPage(canScrollUpTo)
        }}
      >
        <PinBottomIcon />
      </Button>
    </div>
  )
}

const Questions = ({
  questionnaire,
  loading,
  onSubmit,
}: {
  questionnaire: Questionnaire
  loading: boolean
  onSubmit: (data: FieldValues) => void
}) => {
  const currentPage = useAtomValue(formPageAtom)
  const questions = useQuestions(questionnaire)
  const answers = useWatch()
  const canProceed = useAtomValue(canProceedAtom({ questions, answers }))
  const question = questions[currentPage]

  return (
    <div className="questionnaire-pages" data-testid="questionnaire-pages"
      data-current-page={currentPage} data-question-count={questions.length}>
      {question ? (
        <QuestionSelector key={question.id} question={question} canProceed={canProceed} />
      ) : (
        <AdaptiveQuestionPanel>
          <div className="question-card space-y-5">
            <h1 className="question-heading">Klart att skicka in</h1>
            <p>Du har gått igenom formuläret och det är klart att skicka in.</p>
            <p>Vill du kolla igenom dina svar eller gå tillbaka till en specifik fråga kan du gå till Se alla frågor eller klicka dig tillbaka via pilarna.</p>
            <Button type="submit" disabled={loading} data-testid="questionnaire-submit"
              onClick={() => onSubmit(answers)}>
              {loading && <UpdateIcon className="animate-spin mr-2" />}
              Skicka in
            </Button>
          </div>
        </AdaptiveQuestionPanel>
      )}
    </div>
  )
}

const QuestionnaireIntro = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  const [, setPage] = useAtom(formPageAtom)
  const introHtml =
    questionnaire.introText && questionnaire.introText.trim().length > 0
      ? questionnaire.introText
      : questionnaire.description

  return (
    <AdaptiveQuestionPanel>
      <div className="question-card">
        <h1 className="question-heading">
          {questionnaire.name}
        </h1>
        <div className="my-6 h-px w-full bg-foreground" />
        <div
          className="question-text resource-content [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
        <Button
          type="button"
          className="mx-auto mt-4 w-fit px-7"
          onClick={(event) => {
            event.preventDefault()
            setPage(0)
          }}
        >
          Gå vidare
        </Button>
      </div>
    </AdaptiveQuestionPanel>
  )
}

const SectionHandler = () => {
  const safety = useQuestionnaireSafety()
  if (safety?.active) {
    return (
      <>
        <div className="questionnaire-attribution">
          <p className="sr-only">
            Skapat av
          </p>
          <img
            src="/vgr-logo.png"
            alt="Västra Götalandsregionen"
            className="h-6 md:h-8"
          />
        </div>
        <QuestionnaireQuickExit />
      </>
    )
  }

  return null
}

const InitiallyScrollToLastAnsweredQuestion = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  useScrollToLastAnsweredQuestion(questionnaire)

  return null
}

const LoadedForm = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  useVisualViewport()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const page = useAtomValue(formPageAtom)
  const form = useFormStateWithCache({
    questionnaire,
  })

  const { dailyQuestionnaire } = useAtomValue(studySettingsAtom)
  const draftKey = useQuestionnaireDraftKey(questionnaire)
  const [started] = useState(() => {
    const draft = readQuestionnaireDraft(draftKey)
    // Older drafts have no known start time; never invent one on resume.
    return draft ? draft.started ?? null : new Date().toISOString()
  })
  const [, setPage] = useAtom(formPageAtom)
  const onSubmit = async (data: FieldValues) => {
    const submission = prepareSubmission(questionnaire, data)
    form.clearErrors()
    if (submission.errors.length) {
      for (const error of submission.errors) form.setError(error.id, { type: 'validate', message: error.message })
      setPage(submission.errors[0].index)
      return
    }
    setLoading(true)
    try {
      // get date from query params
      const date = new URLSearchParams(window.location.search).get('date')

      await Promise.allSettled([
        await submitQuestionnaire(questionnaire.id, submission.answers, date, started),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ])
    } catch (e) {
      console.error(e)
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request.',
      })
      setLoading(false)
      return
    }
    localStorage.removeItem(draftKey)
    navigate('/form/success', { state: { daily: questionnaire.id === dailyQuestionnaire } })
  }

  return (
    <Form {...form}>
      <QuestionnaireSafetyProvider questionnaire={questionnaire}>
      <form
        className="questionnaire-shell bg-background text-foreground"
        onSubmit={(e) => e.preventDefault()}
      >
        <InitiallyScrollToLastAnsweredQuestion questionnaire={questionnaire} />
        <SyncFormStateToLocalStorage questionnaire={questionnaire} started={started} />
        <header className="questionnaire-header">
          <QuestionNavigationList questionnaire={questionnaire} />
          <ProgressBar questionnaire={questionnaire} />
        </header>
        {page < 0 ? (
          <QuestionnaireIntro questionnaire={questionnaire} />
        ) : (
          <Questions
            questionnaire={questionnaire}
            loading={loading}
            onSubmit={onSubmit}
          />
        )}
        <footer className="questionnaire-footer">
          <SectionHandler />
          {page >= 0 && <NavigationButtons questionnaire={questionnaire} />}
        </footer>
      </form>
      </QuestionnaireSafetyProvider>
    </Form>
  )
}

const DailyEligibility = ({ date, children }: { date: Date; children: ReactNode }) => {
  const schedule = useAtomValue(dailyQuestionnaireScheduleAtom)
  if (!eligibleHistoryDate(date, schedule.startDate, schedule.endDate, new Date())) {
    return <div className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-5 p-6">
      <h1 className="text-2xl font-black">Datumet ligger utanför formulärperioden</h1>
      <p>Välj en tillgänglig dag i din formulärhistorik.</p>
      <Button className="h-auto min-h-11 whitespace-normal py-3" onClick={() => window.location.assign(window.location.pathname + '/history')}>Till formulärhistoriken</Button>
    </div>
  }
  return children
}

const FormPage = () => {
  const { id } = useParams()
  const auth = useAtomValue(authAtom)
  const questionnaire = useAtomValue(questionnaireAtom(id ?? ''))
  const settings = useAtomValue(studySettingsAtom)

  const [answers, refreshAnswers] = useAtom(
    answersForQuestionnaireAtom(questionnaire.id)
  )
  const queryDate = new URLSearchParams(window.location.search).get('date')
  const date = questionnaireDate()

  useEffect(() => {
    if (questionnaire.id) {
      refreshAnswers()
    }
  }, [questionnaire.id, auth?.id, refreshAnswers])

  const answered = questionnaireAnswered(questionnaire, answers, date)

  if (questionnaire.id === settings.treatmentEndQuestionnaire) {
    return <TreatmentEndForm key={questionnaire.id} questionnaire={questionnaire} />
  }

  if (answered) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-center">
          Du har redan svarat på det här formuläret. <br />
          <Button
            onClick={() => {
              window.history.back()
            }}
          >
            Gå tillbaka
          </Button>
        </p>
      </div>
    )
  }

  const content = (
    <ErrorBoundary
      fallback={
        <div className="flex justify-center items-center h-screen">
          <p className="text-center">
            Något gick fel med formuläret. <br />
            <Button
              onClick={() => {
                localStorage.removeItem(keyForQuestionnaire(questionnaire))
                // reload window
                window.location.reload()
              }}
            >
              Rensa svar
            </Button>
          </p>
        </div>
      }
    >
      <Suspense fallback={<div>Loading...</div>}>
        {questionnaire && (
          <LoadedForm key={`${auth?.id}:${questionnaire.id}:${queryDate ?? "today"}`} questionnaire={questionnaire} />
        )}
      </Suspense>
    </ErrorBoundary>
  )
  return questionnaire.id === settings.dailyQuestionnaire
    ? <DailyEligibility date={date}>{content}</DailyEligibility>
    : content
}

export default FormPage
