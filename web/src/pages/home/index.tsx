import { Separator } from '@/components/ui/separator'
import InitialForm from './components/InitialForm'
import HomeTodoItem from './components/HomeTodoItem'
import { CalendarIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { readAboutPageAtom, userDataAtom } from '@/state'
import BaselineForm from './components/BaselineForm'
import { startTransition } from 'react'
import { Button } from '@/components/ui/button'

function HomePage() {
  const navigate = useNavigate()
  const handleNavigation = (path: string) => {
    startTransition(() => {
      navigate(path)
    })
  }

  const user = useAtomValue(userDataAtom)
  const hasReadAboutPage = useAtomValue(readAboutPageAtom)
  const dailyDescription = user?.treatmentStart
    ? `Med start ${user?.treatmentStart?.toISOString().slice(0, 10)}`
    : 'Ange'

  return (
    <div className="container mx-auto p-4">
      <div className="w-full flex flex-col align-center justify-center mb-4">
        <h1 className="text-3xl font-bold text-center">
          Välkommen till studien!
        </h1>
        <p className="text-center">Tack för att du är med och deltar.</p>
      </div>

      <Separator className="m-4" />

      <p className="mb-2">
        Nedan kan du se en överblick på vad du behöver göra under studiens tid.
      </p>
      <div className="flex flex-col gap-2">
        <InitialForm />
        <button
          onClick={() => handleNavigation('/about')}
          className="text-left"
        >
          <HomeTodoItem
            index={2}
            icon={<InfoCircledIcon />}
            title="Läs på om studien"
            description="Ta del av information om studien och dess syfte."
            done={hasReadAboutPage}
          />
        </button>
        <BaselineForm />
        <HomeTodoItem
          index={4}
          icon={<CalendarIcon />}
          title="Dagligt formulär"
          description={dailyDescription}
          action={
            <Button
              onClick={() => {
                startTransition(() =>
                  navigate(`/forms/sdzkpd49ndccf5b/history`)
                )
              }}
            >
              Se schema
            </Button>
          }
        />
        <HomeTodoItem
          index={4}
          icon={<CalendarIcon />}
          title="Ange slutdatum för strålbehandling"
          description={'Du kommer få en påminnelse när det är dags'}
        />
      </div>
    </div>
  )
}

export default HomePage
