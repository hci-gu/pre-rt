import { Button } from '@/components/ui/button'
import { studySettingsAtom, userDataAtom } from '@/state'
import { CheckCircledIcon, ClockIcon } from '@radix-ui/react-icons'
import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeTodoItem from './HomeTodoItem'
import { useAtomValue } from 'jotai'

function InitialForm() {
  const { dailyQuestionnaire } = useAtomValue(studySettingsAtom)
  const navigate = useNavigate()
  const user = useAtomValue(userDataAtom)

  if (!!user?.treatmentStart) {
    return (
      <HomeTodoItem
        index={1}
        icon={<CheckCircledIcon className="text-green-600" />}
        title={`Du har registrerat dig, din behandlingsstart är: ${new Date(
          user.treatmentStart
        ).toLocaleDateString()}`}
        done
        action={
          <Button
            onClick={() => {
              startTransition(() => navigate(`/forms/${dailyQuestionnaire}/history`))
            }}
          >
            Se schema
          </Button>
        }
      />
    )
  }

  return (
    <HomeTodoItem
      index={1}
      icon={<ClockIcon />}
      title="Du är registrerad men har inte fått en start för behandling, vänligen kom tillbaka senare."
    />
  )
}

export default InitialForm
