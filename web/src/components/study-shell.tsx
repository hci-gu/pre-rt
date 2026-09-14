import { NavLink, useLocation } from 'react-router-dom'
import { Fragment, ReactNode, Suspense } from 'react'
import { useAtomValue } from 'jotai'
import { resourceCollectionAtom } from '@/state'
import preRtLogo from '@/assets/redesign/logos/pre-rt-logo--p56.svg'
import guSeal from '@/assets/redesign/logos/gothenburg-university-seal--p57.svg'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type BreadcrumbItemType = {
  label: string
  href?: string
}

type StudyAppShellProps = {
  children: ReactNode
  breadcrumbs?: BreadcrumbItemType[]
  variant?: 'page' | 'form'
}

const headerItemsForPath = (pathname: string): BreadcrumbItemType[] => {
  if (pathname === '/') return [{ label: 'Välkommen till studien!' }]
  if (pathname.startsWith('/check-in')) {
    return [{ label: 'Start', href: '/' }, { label: 'Dagligt formulär' }]
  }
  if (pathname.startsWith('/about')) {
    return [{ label: 'Start', href: '/' }, { label: 'Om studien' }]
  }
  if (pathname.startsWith('/after-treatment')) {
    return [{ label: 'Start', href: '/' }, { label: 'Efter strålbehandlingen' }]
  }
  if (pathname === '/faq') {
    return [{ label: 'Start', href: '/' }, { label: 'Frågor och svar' }]
  }
  if (pathname.startsWith('/faq/')) {
    return [
      { label: 'Start', href: '/' },
      { label: 'Frågor och svar', href: '/faq' },
      { label: pathname === '/faq/mer' ? 'Om du vill veta mer' : 'Frågor och svar' },
    ]
  }
  if (pathname.startsWith('/profile')) {
    return [{ label: 'Start', href: '/' }, { label: 'Profil' }]
  }

  return [{ label: 'Start', href: '/' }]
}

export function StudyFooter() {
  return (
    <footer className="w-full bg-study-header text-foreground">
      <div className="mx-auto flex min-h-[5.375rem] w-full max-w-[57rem] items-center gap-4 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <img
            src={guSeal}
            alt="Goteborgs universitet"
            className="h-12 w-12 shrink-0"
          />
          <p className="max-w-3xl text-sm font-bold leading-snug">
            Pre-RT studien är ett samarbete mellan Göteborgs Universitet och
            Sahlgrenska universitetssjukhuset
            <br />
            Kontakta:{' '}
            <a
              href="mailto:linda.akeflo@gu.se"
              className="font-extrabold underline underline-offset-4"
            >
              Linda Åkeflo
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

function StudyBreadcrumbs({ items }: { items: BreadcrumbItemType[] }) {
  if (items.length === 0) return null

  return (
    <Breadcrumb className="sm:translate-y-3.5">
      <BreadcrumbList className="gap-2 text-base font-semibold leading-tight text-foreground sm:gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <NavLink
                      to={item.href}
                      className="font-semibold text-foreground/65 hover:text-foreground"
                    >
                      {item.label}
                    </NavLink>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-black text-foreground">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className="flex items-center font-semibold text-foreground/45">
                  {'>'}
                </BreadcrumbSeparator>
              )}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function FaqBreadcrumbs({ collectionId }: { collectionId: string }) {
  const collection = useAtomValue(resourceCollectionAtom(collectionId))
  return (
    <StudyBreadcrumbs items={[
      { label: 'Start', href: '/' },
      { label: 'Frågor och svar', href: '/faq' },
      { label: collection?.pageTitle || collection?.name || 'Frågor och svar' },
    ]} />
  )
}

export function StudyAppShell({
  children,
  breadcrumbs = [],
  variant = 'page',
}: StudyAppShellProps) {
  const location = useLocation()
  const headerItems = breadcrumbs.length
    ? breadcrumbs
    : headerItemsForPath(location.pathname)
  const isHome = location.pathname === '/'
  const faqCollectionId = !breadcrumbs.length &&
    location.pathname.startsWith('/faq/') && location.pathname !== '/faq/mer'
      ? location.pathname.split('/')[2]
      : undefined

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 w-full border-b border-foreground/15 bg-study-header">
        <div
          className={cn(
            'mx-auto flex w-full max-w-[57rem] items-center px-4 sm:h-[5.625rem] sm:flex-row sm:justify-start sm:gap-8 sm:px-8',
            isHome
              ? 'h-[6.5rem] flex-col justify-center gap-2 text-center sm:relative sm:gap-0'
              : 'h-[5.625rem] gap-8 sm:gap-[3.75rem]'
          )}
        >
          <NavLink
            to="/"
            className={cn(
              'study-focus flex w-fit shrink-0 items-center gap-3 rounded-full',
              isHome && 'sm:absolute sm:left-8'
            )}
          >
            <img src={preRtLogo} alt="Pre-RT" className="h-12 w-auto" />
          </NavLink>
          {isHome ? (
            <h1 className="mx-auto text-3xl font-black leading-none text-foreground md:text-4xl">
              {headerItems[0]?.label}
            </h1>
          ) : faqCollectionId ? (
            <Suspense fallback={<StudyBreadcrumbs items={headerItems} />}>
              <FaqBreadcrumbs collectionId={faqCollectionId} />
            </Suspense>
          ) : (
            <StudyBreadcrumbs items={headerItems} />
          )}
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-[57rem] flex-1 px-4 sm:px-8',
          variant === 'form' ? 'py-0' : 'py-6 md:py-7'
        )}
      >
        <div className="mx-auto w-full max-w-[40rem]">
          {children}
        </div>
      </main>

      <StudyFooter />
    </div>
  )
}
