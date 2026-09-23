import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Questionnaire } from '@/state'
import { ArrowLeftIcon, ListBulletIcon } from '@radix-ui/react-icons'
import useQuestions from '../hooks/useQuestions'
import { Separator } from '@/components/ui/separator'
import { useAtom } from 'jotai'
import { formPageAtom } from '../state'
import QuestionnaireDialogContent from './QuestionnaireDialogContent'
import { useNavigate } from 'react-router-dom'

const stripHtml = (html: string) => {
  const text =
    new DOMParser()
      .parseFromString(html, 'text/html')
      .documentElement.textContent ?? ''

  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const QuestionNavigationList = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  const questions = useQuestions(questionnaire)
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useAtom(formPageAtom)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="questionnaire-menu-trigger bg-transparent font-bold leading-tight text-foreground hover:bg-white/30"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-study-teal-dark text-white">
            <ListBulletIcon className="h-7 w-7 lg:h-5 lg:w-5" />
          </span>
          Se alla frågor
        </Button>
      </DialogTrigger>
      <QuestionnaireDialogContent leadingAction={
        <DialogClose asChild>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeftIcon aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0">Lämna formuläret</span>
          </Button>
        </DialogClose>
      }>
        <DialogHeader className="mb-4 flex flex-col items-center gap-2 px-8 text-center">
          <DialogTitle className="text-3xl font-black leading-tight text-foreground">
            Frågor
          </DialogTitle>
          <div className="h-px w-full bg-foreground" />
          <DialogDescription className="text-md font-medium text-foreground">
            Klicka på en fråga för att hoppa till den.
          </DialogDescription>
        </DialogHeader>
        <div
          className="min-w-0"
          data-question-navigation-scroll
        >
          <ul className="min-w-0 space-y-2 pr-2 text-foreground">
            {questions.map((question, index) => {
              const text = stripHtml(question.text)
              const isSelected = index === currentPage

              if (question.type === 'section') {
                return (
                  <li
                    key={`QuestionNavigator_${question.id}`}
                    className="px-3 pt-5 text-lg font-black text-foreground"
                  >
                    {text}
                  </li>
                )
              }

              return (
                <li
                  className="min-w-0"
                  key={`QuestionNavigator_${question.id}`}
                >
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="link"
                      className={cn(
                        'h-auto w-full min-w-0 max-w-full justify-start overflow-hidden rounded-xl px-3 py-2 text-left text-base font-bold text-foreground hover:no-underline',
                        isSelected && 'bg-study-header'
                      )}
                      onClick={() => setCurrentPage(index)}
                    >
                      <span className="mr-2 shrink-0">{question.number}.</span>
                      <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">{text}</span>
                    </Button>
                  </DialogClose>
                  <Separator className="mt-2" />
                </li>
              )
            })}
          </ul>
        </div>
      </QuestionnaireDialogContent>
    </Dialog>
  )
}

export default QuestionNavigationList
