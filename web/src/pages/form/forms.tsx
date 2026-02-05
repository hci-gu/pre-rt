import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Questionnaire, questionnairesAtom, useAnswers } from '@/state'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { startTransition } from 'react'

const DailyQuestionnaireCTA = () => {
  const navigate = useNavigate()

  return (
    <div>
      <Button
        className="w-full py-8 mb-8 flex flex-col gap-4"
        onClick={() => {
          startTransition(() => {
            navigate(`/forms/sdzkpd49ndccf5b`)
          })
        }}
      >
        <span className="text-2xl font-bold">Till dagligt formulär</span>
      </Button>
    </div>
  )
}

const QuestionnaireCard = ({
  questionaire,
}: {
  questionaire: Questionnaire
}) => {
  const answers = useAnswers(questionaire.id)
  const navigate = useNavigate()

  const answered = questionaire.occurrence == 'once' && answers.length > 0

  if (questionaire.id === 'sdzkpd49ndccf5b') {
    return <DailyQuestionnaireCTA />
  }

  return (
    <Card className="mb-4">
      <CardHeader className="text-xl font-bold">{questionaire.name}</CardHeader>
      <CardContent>
        <div className="flex justify-between">
          <p
            dangerouslySetInnerHTML={{
              __html: questionaire.description,
            }}
          ></p>
          <Button
            disabled={answered}
            onClick={() => {
              startTransition(() => {
                navigate(`/forms/${questionaire.id}`)
              })
            }}
          >
            Svara
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between items-end">
          {questionaire.occurrence != 'once' ? (
            <p className="font-light text-muted-foreground">
              {answers.length} svar
            </p>
          ) : (
            <p className="font-light text-muted-foreground">
              {answers.length ? 'Svarat' : 'Inte svarat'}
            </p>
          )}
          {questionaire.occurrence != 'once' && (
            <Button
              variant={'secondary'}
              onClick={() => {
                startTransition(() => {
                  navigate(`/forms/${questionaire.id}/history`)
                })
              }}
            >
              Se tidigare svar
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}

const Introduction = () => {
  return (
    <div className="mb-16">
      <h1 className="text-4xl font-bold">Här checkar du in!</h1>
      <p className="mt-2 text-lg">
        Här kan både du och vi följa hur du mår under behandlingen. Det bästa är
        om du checkar in varje gång du använder staven.
        <br></br>
        <br></br>
        Här ser du också din startpunkt - den svarar du på i början av din
        behandling.
      </p>
    </div>
  )
}

const FormsPage = () => {
  const questionaires = useAtomValue(questionnairesAtom)

  return (
    <div className="p-4">
      <Introduction />
      <div className="mt-4">
        {questionaires?.map((questionaire: Questionnaire) => (
          <QuestionnaireCard
            key={`QuestionnaireCard_${questionaire.id}`}
            questionaire={questionaire}
          />
        ))}
      </div>
    </div>
  )
}

export default FormsPage
