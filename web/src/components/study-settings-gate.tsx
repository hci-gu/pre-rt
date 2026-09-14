import { Suspense, type ReactNode } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { loadable } from 'jotai/utils'
import { Link } from 'react-router-dom'
import { studySettingsAtom } from '@/state'
import { Button } from './ui/button'

const settingsStateAtom = loadable(studySettingsAtom)
const loading = <p role="status">Hämtar studieinformation…</p>

export default function StudySettingsGate({ children }: { children: ReactNode }) {
  const state = useAtomValue(settingsStateAtom)
  const retry = useSetAtom(studySettingsAtom)

  if (state.state === 'loading') return loading
  if (state.state === 'hasError') {
    return (
      <div className="space-y-4" role="alert">
        <p>Det gick inte att hämta studiens inställningar. Försök igen eller logga in på nytt.</p>
        <div className="flex gap-3">
          <Button onClick={() => retry()}>Försök igen</Button>
          <Button asChild variant="outline"><Link to="/login">Logga in</Link></Button>
        </div>
      </div>
    )
  }
  return <Suspense fallback={loading}>{children}</Suspense>
}
