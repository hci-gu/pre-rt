import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Button } from './ui/button'

export function PageBackLink({ to = '/', children = 'Tillbaka till startsidan' }: { to?: string; children?: string }) {
  return (
    <Button asChild variant="secondary" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal py-3 text-center">
      <Link to={to}>
        <ArrowLeftIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0">{children}</span>
      </Link>
    </Button>
  )
}
