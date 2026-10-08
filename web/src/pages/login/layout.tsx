import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useParams } from 'react-router-dom'

const LoginLayout = ({ children }: { children: any }) => {
  const params = useParams()
  const hasToken = !!params.token

  const breadCrumbs = hasToken
    ? [
        {
          label: 'Hem',
          href: '/welcome',
        },
        {
          label: 'Login',
          href: '/login',
        },
        {
          label: 'OTP',
        },
      ]
    : [
        {
          label: 'Hem',
          href: '/welcome',
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
