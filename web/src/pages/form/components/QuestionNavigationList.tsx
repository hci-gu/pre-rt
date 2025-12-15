import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Questionnaire } from '@/state'
import { ListBulletIcon } from '@radix-ui/react-icons'
import useQuestions from '../hooks/useQuestions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAtom, useAtomValue } from 'jotai'
import { answeredUpTo, formPageAtom } from '../state'
import { useWatch } from 'react-hook-form'

const QuestionNavigationList = ({
  questionnaire,
}: {
  questionnaire: Questionnaire
}) => {
  const questions = useQuestions(questionnaire)
  const [page, setCurrentPage] = useAtom(formPageAtom)
  const answers = useWatch()
  const disabledAfter = useAtomValue(
    answeredUpTo({
      questions,
      answers,
    })
  )
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

  return (
    <Dialog>
      <DialogTrigger className="fixed left:0 md:top-16 md:right-8 z-50">
        <Button
          type="button"
          variant={isMobile ? 'link' : 'outline'}
          className="text-white md:text-black bg-none"
        >
          <ListBulletIcon className="mr-2" />
          Se alla frågor
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-[80vw] md:w-[50vw] max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="flex flex-col gap-2 mb-4 w-80">
          <h2 className="text-2xl font-semibold">Frågor</h2>
          <span className="text-md font-light">
            Klicka på en fråga för att hoppa till den.
          </span>
        </DialogHeader>
        <DialogDescription className="h-full">
          <ScrollArea className="h-[60vh]">
            <ul className="space-y-2">
              {questions.map((question, index) => (
                <DialogClose asChild key={`QuestionNavigator_${question.id}`}>
                  <li
                    onClick={() => {
                      setCurrentPage(index)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {question.type !== 'section' && (
                        <span className="md:mr-2">{question.number}.</span>
                      )}
                      <Button
                        disabled={disabledAfter < index}
                        variant="link"
                        className={`
                          w-full text-left justify-start text-foreground hover:no-underline overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer
                          ${index === page ? 'font-black' : 'font-regular'}
                        `}
                        dangerouslySetInnerHTML={{
                          __html: `${question.text}`,
                        }}
                      />
                    </div>
                    <Separator />
                  </li>
                </DialogClose>
              ))}
            </ul>
          </ScrollArea>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

export default QuestionNavigationList
