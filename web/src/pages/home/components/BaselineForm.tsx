import { useAnswers } from '@/state'
import { BoxIcon } from '@radix-ui/react-icons'
import { startTransition } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HomeTodoItem from './HomeTodoItem'

const BASELINE_FORM_ID = 'u6917wm639q1d01'

function BaselineForm() {
  const navigate = useNavigate()
  const answers = useAnswers(BASELINE_FORM_ID)

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
      to={`/forms/${BASELINE_FORM_ID}`}
      onClick={(e) => {
        e.preventDefault()
        startTransition(() => {
          navigate(`/forms/${BASELINE_FORM_ID}`)
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
