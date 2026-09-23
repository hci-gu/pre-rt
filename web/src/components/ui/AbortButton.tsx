import { Button } from '@/components/ui/button'
import { Questionnaire } from '@/state'
import { keyForQuestionnaire } from '../../pages/form/hooks/useFormState'
import { LogOut } from 'lucide-react'

const AbortButton = ({ questionnaire, inline = false }: { questionnaire?: Questionnaire; inline?: boolean }) => {
  const onClick = () => {
    if (questionnaire) {
      localStorage.removeItem(keyForQuestionnaire(questionnaire))
    }
    location.replace('https://www.google.se')
  }

  return (
    <div className={inline ? 'min-w-0' : 'fixed bottom-4 left-4 z-50 md:bottom-4'}>
      <Button
        type="button"
        onClick={onClick}
        variant="destructive"
        className={`min-h-12 rounded-lg bg-destructive px-4 text-sm font-black text-white shadow-md hover:bg-destructive/90 ${inline ? 'h-auto max-w-full whitespace-normal py-2' : 'h-12'}`}
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span className="min-w-0 [overflow-wrap:anywhere]">Lämna genast</span>
      </Button>
    </div>
  )
}

export default AbortButton
