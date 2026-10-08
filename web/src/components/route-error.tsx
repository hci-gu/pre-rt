import { Link, useRouteError } from 'react-router-dom'
import { Button } from './ui/button'

export default function RouteError({ notFound = false }: { notFound?: boolean }) {
  const error = useRouteError() as { status?: number } | undefined
  const missing = notFound || error?.status === 404
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-5 px-6 py-10 [overflow-wrap:anywhere]">
      <h1 className="text-3xl font-black">{missing ? 'Sidan kunde inte hittas' : 'Det gick inte att öppna sidan'}</h1>
      <p>{missing ? 'Länken kan vara gammal eller sidan har tagits bort.' : 'Kontrollera din internetanslutning och försök igen. Dina sparade utkast finns kvar.'}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal py-2"><Link to="/">Till startsidan</Link></Button>
        {!missing && <Button onClick={() => window.location.reload()} className="h-auto min-h-11 max-w-full whitespace-normal py-2">Försök igen</Button>}
      </div>
    </main>
  )
}
