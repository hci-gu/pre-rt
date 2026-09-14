import { ReactNode } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { loadable } from 'jotai/utils'
import { useNavigate } from 'react-router-dom'
import { authAtom, pb, ResourceCollection, resourcesAtom } from '@/state'
import { ResourceSessionError } from '@/lib/resource-errors'
import { Button } from './ui/button'

const collectionsLoadable = loadable(resourcesAtom)

export default function FaqCollections({
  children,
}: {
  children: (collections: ResourceCollection[]) => ReactNode
}) {
  const result = useAtomValue(collectionsLoadable)
  const retry = useSetAtom(resourcesAtom)
  const setAuth = useSetAtom(authAtom)
  const navigate = useNavigate()

  if (result.state === 'loading') {
    return <p role="status">Hämtar frågor och svar…</p>
  }

  if (result.state === 'hasError') {
    const sessionExpired = result.error instanceof ResourceSessionError
    return (
      <div className="space-y-4">
        <p role="alert">
          {sessionExpired
            ? 'Din inloggning gäller inte längre. Logga in igen för att se frågor och svar.'
            : 'Det gick inte att hämta frågor och svar. Försök igen.'}
        </p>
        <Button onClick={() => {
          if (sessionExpired) {
            pb.authStore.clear()
            setAuth(null)
            navigate('/login')
          } else {
            retry()
          }
        }}>
          {sessionExpired ? 'Logga in igen' : 'Försök igen'}
        </Button>
      </div>
    )
  }

  if (result.data.length === 0) {
    return <p role="status">Det finns inga frågor och svar att visa just nu.</p>
  }

  return children(result.data)
}
