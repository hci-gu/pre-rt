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

const LoginWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <div className="flex items-center justify-center bg-stone-800 p-2 md:hidden w-full">
        <img
          src="/gu-logo.svg" // Adjust the path as needed for the dark logo variant
          alt="Göteborgs Universitet Icon"
          className="h-8 w-8"
        />
      </div>

      <div className="relative min-h-[calc(100svh-3rem)] md:min-h-svh flex flex-col lg:grid lg:grid-cols-2 lg:max-w-none lg:px-0">
        {/* Sidebar Section */}
        <div className="flex-1 relative hidden lg:flex flex-col bg-muted p-10 text-white dark:border-r">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <img
              src="/gu-logo.svg"
              alt="Göteborgs Universitet Icon"
              className="mr-2 h-12 w-12"
            />
            Göteborgs Universitet
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <FooterContent />
            </blockquote>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 lg:p-8">
          {children}
        </div>

        <div className="bg-zinc-900 text-white w-full min-h-36 lg:hidden flex items-center justify-center p-4">
          <blockquote className="space-y-2 text-center">
            <FooterContent />
          </blockquote>
        </div>
      </div>
    </>
  )
}

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
