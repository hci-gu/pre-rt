import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { Link, useNavigate } from 'react-router-dom'
import { answersForQuestionnaireAtom, dailyQuestionnaireScheduleAtom, pb, userDataAtom, type Questionnaire } from '@/state'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'

// Only the configured treatment-end form is editable. Other once-only forms
// continue through the normal completion guard.
export default function TreatmentEndForm({ questionnaire }: { questionnaire: Questionnaire }) {
  const user = useAtomValue(userDataAtom)
  const refreshUser = useSetAtom(userDataAtom)
  const refreshSchedule = useSetAtom(dailyQuestionnaireScheduleAtom)
  const refreshAnswers = useSetAtom(answersForQuestionnaireAtom(questionnaire.id))
  const navigate = useNavigate()
  const [date, setDate] = useState<Date | undefined>(user?.treatmentEnd)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!date || saving) return
    setSaving(true)
    setError('')
    try {
      await pb.send('/treatment-end', { method: 'PUT', body: { date: format(date, 'yyyy-MM-dd') } })
    } catch (cause) {
      const response = (cause as { response?: { message?: string } }).response
      setError(response?.message || 'Datumet kunde inte sparas. Ditt tidigare datum finns kvar. Försök igen.')
      setSaving(false)
      return
    }
    refreshUser()
    refreshSchedule()
    await refreshAnswers()
    navigate('/')
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <Link to="/check-in" className="study-focus inline-block font-bold underline">Tillbaka till check-in</Link>
        <h1 className="text-3xl font-black leading-tight">{questionnaire.name}</h1>
        <p>{user?.treatmentEnd ? 'Här kan du ändra datumet för din sista strålbehandling.' : 'Ange datumet för din sista strålbehandling.'}</p>
        <div className="space-y-3 rounded-xl bg-card p-5">
          <h2 className="font-bold">Slutdatum strålbehandling</h2>
          <DatePicker date={date} onChange={setDate} />
          {error && <p role="alert" className="font-semibold text-destructive">{error}</p>}
          <div>
            <Button type="button" disabled={!date || saving} onClick={save}>
              {saving ? 'Sparar…' : 'Spara datum'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
