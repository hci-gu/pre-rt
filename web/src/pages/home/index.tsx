import { StudyTaskCard } from '@/components/study-task-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authAtom, pb, studySettingsAtom, useAnswers, userDataAtom } from '@/state'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import registrationArtSquare from '@/assets/redesign/dashboard-cards/registration-card-square--p64.svg'
import registrationArtWide from '@/assets/redesign/dashboard-cards/registration-card-wide--p58.svg'
import initialQuestionnaireArtSquare from '@/assets/redesign/dashboard-cards/initial-questionnaire-card-square--p65.svg'
import initialQuestionnaireArtWide from '@/assets/redesign/dashboard-cards/initial-questionnaire-card-wide--p59.svg'
import studyInfoArtSquare from '@/assets/redesign/dashboard-cards/study-info-card-square--p66.svg'
import studyInfoArtWide from '@/assets/redesign/dashboard-cards/study-info-card-wide--p60.svg'
import faqArtSquare from '@/assets/redesign/dashboard-cards/faq-card-square--p67.svg'
import faqArtWide from '@/assets/redesign/dashboard-cards/faq-card-wide--p61.svg'
import dailyFormArtSquare from '@/assets/redesign/dashboard-cards/daily-form-card-square--p68.svg'
import dailyFormArtWide from '@/assets/redesign/dashboard-cards/daily-form-card-wide--p62.svg'
import afterTreatmentArtSquare from '@/assets/redesign/dashboard-cards/after-treatment-card-square--p69.svg'
import afterTreatmentArtWide from '@/assets/redesign/dashboard-cards/after-treatment-card-wide--p63.svg'

function HomePage() {
  const { baselineQuestionnaire } = useAtomValue(studySettingsAtom)
  const user = useAtomValue(userDataAtom)
  const auth = useAtomValue(authAtom)
  const baselineAnswers = useAnswers(baselineQuestionnaire)
  const baselineAnswered = baselineAnswers.length > 0
  const treatmentStart = user?.treatmentStart
  const [isTestAccount, setIsTestAccount] = useState(false)
  const [newTreatmentStart, setNewTreatmentStart] = useState('')
  const [newDiagnosis, setNewDiagnosis] = useState('')
  const [newUserType, setNewUserType] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${import.meta.env.VITE_API_URL}/test-login`, {
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((status) => setIsTestAccount(status?.userId === auth?.id))
      .catch(() => {})

    return () => controller.abort()
  }, [auth?.id])

  const resetTestAccount = async () => {
    const confirmed = window.confirm(
      `Radera alla svar och återställ testkontot med behandlingsstart ${newTreatmentStart}, diagnos ${newDiagnosis} och typ ${newUserType}?`
    )
    if (!confirmed) return

    setResetting(true)
    setResetError(false)

    try {
      await pb.send('/test-login/reset', {
        method: 'POST',
        body: {
          treatmentStart: newTreatmentStart,
          diagnosis: newDiagnosis,
          type: newUserType,
        },
      })

      for (const key of Object.keys(localStorage)) {
        if (key !== 'auth') {
          localStorage.removeItem(key)
        }
      }

      window.location.reload()
    } catch {
      setResetError(true)
      setResetting(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3 text-center">
        <p className="mx-auto max-w-xl text-base font-semibold leading-snug text-foreground">
          Tack för att du är med och deltar.
          <br />
          Nedan kan du se en överblick på vad du behöver göra under studiens
          tid.
        </p>
      </section>

      <section
        aria-label="Studieöversikt"
        className="grid grid-cols-2 gap-3 sm:gap-x-7 sm:gap-y-5"
      >
        <StudyTaskCard
          title="Registrera dig"
          illustration={registrationArtSquare}
          desktopIllustration={registrationArtWide}
          complete={Boolean(treatmentStart)}
        />

        <StudyTaskCard
          title="Inledande frågeformulär"
          illustration={initialQuestionnaireArtSquare}
          desktopIllustration={initialQuestionnaireArtWide}
          complete={baselineAnswered}
          href={baselineAnswered ? undefined : `/forms/${baselineQuestionnaire}`}
          titleClassName="max-w-[70%]"
        />

        <StudyTaskCard
          title="Läs om studien"
          illustration={studyInfoArtSquare}
          desktopIllustration={studyInfoArtWide}
          href="/about"
        />

        <StudyTaskCard
          title="Frågor & svar"
          illustration={faqArtSquare}
          desktopIllustration={faqArtWide}
          href="/faq"
          titleClassName="max-w-[78%]"
        />

        <StudyTaskCard
          title="Dagligt formulär"
          illustration={dailyFormArtSquare}
          desktopIllustration={dailyFormArtWide}
          href="/check-in"
        />

        <StudyTaskCard
          title="Efter strålbehandlingen"
          illustration={afterTreatmentArtSquare}
          desktopIllustration={afterTreatmentArtWide}
          href="/after-treatment"
          titleClassName="max-w-[76%] text-foreground"
        />
      </section>

      {isTestAccount && (
        <section className="rounded-2xl border border-dashed border-border bg-white p-4 text-center">
          <h2 className="font-black">Gemensamt testkonto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Välj testscenario och radera inskickade svar och lokala utkast för
            att börja om från början.
          </p>
          <div className="mx-auto mt-3 grid max-w-64 gap-3 text-left">
            <label
              htmlFor="test-treatment-start"
              className="text-sm font-bold text-foreground"
            >
              Ny behandlingsstart
            </label>
            <Input
              id="test-treatment-start"
              type="date"
              className="mt-1 bg-white"
              value={newTreatmentStart}
              onChange={(event) => setNewTreatmentStart(event.target.value)}
            />
            <label
              htmlFor="test-diagnosis"
              className="text-sm font-bold text-foreground"
            >
              Diagnos
              <select
                id="test-diagnosis"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newDiagnosis}
                onChange={(event) => setNewDiagnosis(event.target.value)}
              >
                <option value="">Välj diagnos</option>
                <option value="anal">Anal</option>
                <option value="corpus">Corpus</option>
                <option value="cervix">Cervix</option>
              </select>
            </label>
            <label
              htmlFor="test-user-type"
              className="text-sm font-bold text-foreground"
            >
              Användartyp
              <select
                id="test-user-type"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newUserType}
                onChange={(event) => setNewUserType(event.target.value)}
              >
                <option value="">Välj typ</option>
                <option value="PRE">PRE</option>
                <option value="POST">POST</option>
              </select>
            </label>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={
              resetting ||
              !newTreatmentStart ||
              !newDiagnosis ||
              !newUserType
            }
            onClick={resetTestAccount}
          >
            {resetting ? 'Återställer...' : 'Återställ testkonto'}
          </Button>
          {resetError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Det gick inte att återställa testkontot. Försök igen.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

export default HomePage
