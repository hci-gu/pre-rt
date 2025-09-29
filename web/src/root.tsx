import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from './components/ui/toaster'
import { PersonIcon } from '@radix-ui/react-icons'
import { useAtomValue } from 'jotai'
import { authAtom } from './state'
import { useEffect, useState } from 'react'

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

const LoginWrapper = ({ children }: { children: any }) => {
  return (
    <>
      <div className="flex items-center justify-center bg-stone-800 p-2 md:hidden fixed w-full">
        <img
          src="/gu-logo.svg" // Adjust the path as needed for the dark logo variant
          alt="Göteborgs Universitet Icon"
          className="h-8 w-8"
        />
      </div>

      <div className="relative h-screen flex flex-col lg:grid lg:grid-cols-2 lg:max-w-none lg:px-0 overflow-hidden">
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
        <div className="flex flex-col items-center justify-center p-4 lg:p-8 h-3/4 lg:h-full">
          {children}
        </div>

        <div className="bg-zinc-900 text-white w-full h-1/4 lg:hidden flex items-center justify-center p-4">
          <blockquote className="space-y-2 text-center">
            <FooterContent />
          </blockquote>
        </div>
      </div>
    </>
  )
}

const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState('up')
  const [prevOffset, setPrevOffset] = useState(0)

  useEffect(() => {
    const toggleScrollDirection = () => {
      const scrollY = window.pageYOffset
      if (scrollY === 0) {
        setScrollDirection('up')
      } else if (scrollY > prevOffset) {
        setScrollDirection('down')
      } else if (scrollY < prevOffset) {
        setScrollDirection('up')
      }
      setPrevOffset(scrollY)
    }

    window.addEventListener('scroll', toggleScrollDirection)
    return () => window.removeEventListener('scroll', toggleScrollDirection)
  }, [prevOffset])

  return scrollDirection
}

const Header = () => {
  const location = useLocation()
  const auth = useAtomValue(authAtom)
  const scrollDirection = useScrollDirection()

  const activeClass = 'border-b-2 border-black'

  return (
    <header
      className={`sticky top-0 flex h-16 items-center border-b bg-background px-4 md:px-12 transition-transform duration-300 ${
        scrollDirection === 'down' ? '-translate-y-16' : 'translate-y-0'
      }`}
    >
      <nav className="w-full flex text-lg font-medium items-center md:gap-5 md:text-sm justify-between">
        <div className="flex gap-8 items-center">
          <img
            src="/gu-logo-dark.svg"
            alt="Göteborgs Universitet Icon"
            className="h-8 w-8"
          />
          <a href="/" className={location.pathname === '/' ? activeClass : ''}>
            Hem
          </a>
          <a
            href="/forms"
            className={location.pathname === '/forms' ? activeClass : ''}
          >
            Formulär
          </a>
          <a
            href="/about"
            className={location.pathname === '/about' ? activeClass : ''}
          >
            Info
          </a>
        </div>
        {auth && (
          <a
            href="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-stone-800"
          >
            <PersonIcon className="w-5 h-5" />
          </a>
        )}
      </nav>
    </header>
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
    location.pathname.includes('/forms/') &&
    !location.pathname.includes('history')
  ) {
    return <Outlet />
  }

  return (
    <>
      <Header />
      <div
        style={{
          position: 'fixed',
          zIndex: -1,
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          background: '#ffdadb',
        }}
      ></div>
      <div className="flex flex-col items-center justify-center">
        <div
          className="w-full md:w-1/2 pb-64 pt-12"
          style={{
            marginTop: '-16px',
          }}
        >
          <Outlet />
        </div>
        <div className="bg-stone-800 text-white w-full h-1/7 flex fixed bottom-0 p-2 sm:p-4">
          <blockquote className="space-y-2">
            <FooterContent />
          </blockquote>
        </div>
        <Toaster />
      </div>
    </>
  )
}
export default RootPage
