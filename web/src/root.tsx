import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { useAtomValue } from 'jotai'
import { authAtom } from './state'
import { ReactNode } from 'react'
import { StudyAppShell } from './components/study-shell'

const FooterContent = () => {
  return (
    <>
      <p className="text-sm sm:text-md">
        Pre-RT studien är ett samarbete mellan Göteborgs Universitet och
        Sahlgrenska
      </p>
      <footer className="text-sm font-light">
        Kontakta{' '}
        <a href="mailto:linda.akeflo@gu.se" className="underline">
          Linda Åkeflo
        </a>{' '}
        för mer information
      </footer>
    </>
  )
}

const LoginWrapper = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-svh flex-col">
    <header className="flex w-full items-center justify-center bg-zinc-900 p-3">
      <img src="/gu-logo.svg" alt="Göteborgs Universitet" className="h-10 w-10" />
    </header>
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
      {children}
    </main>
    <div className="flex w-full items-center justify-center bg-zinc-900 p-6 text-white">
      <blockquote className="max-w-xl space-y-2 text-center">
        <FooterContent />
      </blockquote>
    </div>
  </div>
)

const RootPage = () => {
  const location = useLocation()
  const auth = useAtomValue(authAtom)

  if (!auth) {
    return (
      <LoginWrapper>
        <Outlet />
      </LoginWrapper>
    )
  }

  if (
    (location.pathname.includes('/forms/') &&
      !location.pathname.includes('history')) ||
    location.pathname === '/form/success'
  ) {
    return (
      <>
        <Outlet />
        <Toaster />
      </>
    )
  }

  return (
    <StudyAppShell>
      <Outlet />
      <Toaster />
    </StudyAppShell>
  )
}
export default RootPage
