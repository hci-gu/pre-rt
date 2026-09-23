import { Button } from '@/components/ui/button'
import successIcon from '@/assets/redesign/status/success-check-circle--p55.svg'
import { Link } from 'react-router-dom'
import AdaptiveQuestionPanel from './components/AdaptiveQuestionPanel'
import useVisualViewport from './hooks/useVisualViewport'
import './questionnaire.css'

export default function FormSuccessPage() {
  useVisualViewport()
  return (
    <main className="questionnaire-shell bg-background text-foreground">
      <header className="questionnaire-header">
        <p className="p-2 text-base font-bold">Formuläret är inskickat</p>
      </header>
      <AdaptiveQuestionPanel>
        <div className="question-card">
          <h1 className="question-heading">Tack för ditt svar!</h1>
          <div className="my-5 h-px w-full bg-foreground" />
          <div className="question-heading-group">
            <p className="question-text">Din rapport är nu inskickad.</p>
            <img src={successIcon} alt="" aria-hidden="true" className="h-16 w-16" />
            <p className="question-text">
              Tack för att du rapporterat in din dagliga användning. Dina svar
              bidrar till viktig kunskap inom studien.
            </p>
            <Button asChild className="question-action min-h-12 rounded-xl bg-primary px-6 text-base font-black text-foreground hover:bg-study-teal-dark hover:text-white">
              <Link to="/check-in">Stäng formuläret</Link>
            </Button>
          </div>
        </div>
      </AdaptiveQuestionPanel>
      <footer className="questionnaire-footer" />
    </main>
  )
}
