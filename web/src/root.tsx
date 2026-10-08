import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { useAtomValue } from 'jotai'
import { authAtom } from './state'
import { ReactNode } from 'react'
import { StudyAppShell, StudyFooter } from './components/study-shell'
import preRtLogo from '@/assets/redesign/logos/pre-rt-logo--p56.svg'

const LoginWrapper = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-svh flex-col bg-background text-foreground">
    <header className="flex w-full items-center justify-center border-b border-foreground/15 bg-study-header p-3">
      <img src={preRtLogo} alt="Pre-RT" className="h-12 w-auto" />
    </header>
    <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
      {children}
    </main>
    <StudyFooter />
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
