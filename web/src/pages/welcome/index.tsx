import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

import { loginReturnPath, loginReturnSearch } from '@/lib/login-return'

function WelcomePage() {
  const returnSearch = loginReturnSearch(loginReturnPath(useLocation().search))
  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[27.5rem]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Välkommen till studien
        </h1>
      </div>
      <p className="px-8 text-center text-sm text-muted-foreground">
        För att se dina svar behöver du logga in.
      </p>
      <Link to={`/login${returnSearch}`} className={cn(buttonVariants())}>
        Logga in
      </Link>
    </div>
  )
}

export default WelcomePage
