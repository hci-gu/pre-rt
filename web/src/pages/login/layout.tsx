import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Fragment, type ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useParams, useLocation } from 'react-router-dom'

import { loginReturnPath, loginReturnSearch } from '@/lib/login-return'

const LoginLayout = ({ children }: { children: ReactNode }) => {
  const params = useParams()
  const returnSearch = loginReturnSearch(loginReturnPath(useLocation().search))
  const hasToken = !!params.token

  const breadCrumbs = hasToken
    ? [
        {
          label: 'Hem',
          href: `/welcome${returnSearch}`,
        },
        {
          label: 'Login',
          href: `/login${returnSearch}`,
        },
        {
          label: 'OTP',
        },
      ]
    : [
        {
          label: 'Hem',
          href: `/welcome${returnSearch}`,
        },
        {
          label: 'Login',
        },
      ]
  const description = hasToken
    ? 'Skriv in koden som skickades till din telefon'
    : 'Skriv in ditt telefonnummer för att få en kod att logga in med'

  return (
    <div className="w-full min-w-0 max-w-md [overflow-wrap:anywhere]">
      <Breadcrumb>
        <BreadcrumbList>
          {breadCrumbs.map((item, index) => (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadCrumbs.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

export default LoginLayout
