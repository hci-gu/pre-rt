import { Button } from '@/components/ui/button'
import { Questionnaire } from '@/state'
import { keyForQuestionnaire } from '../../pages/form/hooks/useFormState'

const AbortButton = ({ questionnaire }: { questionnaire?: Questionnaire }) => {
  const onClick = () => {
    if (questionnaire) {
      localStorage.removeItem(keyForQuestionnaire(questionnaire))
    }
    location.replace('https://www.google.se')
  }

  return (
    <div className="fixed bottom-0 left:0 md:bottom-32 md:right-4 z-50">
      <div className="">
        <div className="bg-transparent border-none md:bg-yellow-400 md:bg-opacity-50 p-4 rounded-md md:border md:border-yellow-600">
          <div className="hidden md:block text-center">
            <p className="text-lg font-bold">Hoppa ur formuläret snabbt</p>
            <p className="text-sm w-60">
              Genom att klicka på knappen byts din sida direkt ut till google.se
              och dina svar tas bort.
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              type="button"
              onClick={onClick}
              variant="destructive"
              className="text-white"
            >
              Lämna genast
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AbortButton
