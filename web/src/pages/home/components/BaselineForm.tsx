import { studySettingsAtom, useAnswers } from '@/state'
import { useAtomValue } from 'jotai'
import { BoxIcon } from '@radix-ui/react-icons'
import { startTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HomeTodoItem from './HomeTodoItem'

function BaselineForm() {
  const { baselineQuestionnaire } = useAtomValue(studySettingsAtom)
  const navigate = useNavigate()
  const answers = useAnswers(baselineQuestionnaire)

  if (answers.length > 0) {
    const answeredDate = new Date(answers[0].created).toLocaleDateString(
      'sv-SE'
    )
    return (
      <HomeTodoItem
        index={1}
        title="Fyll i formulär om dig själv"
        description={`Du svarade ${answeredDate}`}
        done
      />
    )
  }

  return (
    <Link
      to={`/forms/${baselineQuestionnaire}`}
      onClick={(e) => {
        e.preventDefault()
        startTransition(() => {
          navigate(`/forms/${baselineQuestionnaire}`)
        })
      }}
    >
      <HomeTodoItem
        index={1}
        icon={<BoxIcon />}
        title="Fyll i formulär om dig själv"
        description="Tar ca 20 minuter att fylla i."
      />
    </Link>
  )
}

export default BaselineForm
