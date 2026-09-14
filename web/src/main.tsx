import { StrictMode } from 'react'
import { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import HomePage from './pages/home/index.tsx'
import LoginPage from './pages/login/index.tsx'
import RootPage from './root.tsx'
import { useAtomValue } from 'jotai'
import { authAtom } from './state.tsx'
import WelcomePage from './pages/welcome/index.tsx'
import LoginLayout from './pages/login/layout.tsx'
import OTPPage from './pages/login/code.tsx'
import FormPage from './pages/form/index.tsx'
import ProfilePage from './pages/profile/index.tsx'
import FormHistoryPage from './pages/form/history/index.tsx'
import AboutPage from './pages/about/index.tsx'
import AfterTreatmentPage from './pages/after-treatment/index.tsx'
import CheckInPage from './pages/check-in/index.tsx'
import FormSuccessPage from './pages/form/success.tsx'
import FaqPage from './pages/faq/index.tsx'
import FaqMorePage from './pages/faq/more.tsx'
import FaqResourcePage from './pages/faq/resource.tsx'
import StudySettingsGate from './components/study-settings-gate.tsx'

const WithAuthLayout = ({ children }: { children: ReactNode }) => {
  const auth = useAtomValue(authAtom)

  if (!auth) {
    return <Navigate to="/welcome" />
  }
  return <div>{children}</div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootPage />,
    children: [
      {
        path: '',
        element: (
          <WithAuthLayout>
            <StudySettingsGate><HomePage /></StudySettingsGate>
          </WithAuthLayout>
        ),
      },
      {
        path: 'forms',
        element: (
          <WithAuthLayout>
            <Navigate to="/check-in" replace />
          </WithAuthLayout>
        ),
      },
      {
        path: 'check-in',
        element: (
          <WithAuthLayout>
            <StudySettingsGate><CheckInPage /></StudySettingsGate>
          </WithAuthLayout>
        ),
      },
      {
        path: 'forms/:id',
        element: (
          <WithAuthLayout>
            <FormPage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'forms/:id/history',
        element: (
          <WithAuthLayout>
            <FormHistoryPage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'form/success',
        element: (
          <WithAuthLayout>
            <FormSuccessPage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'profile',
        element: (
          <WithAuthLayout>
            <ProfilePage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'faq',
        element: (
          <WithAuthLayout>
            <FaqPage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'faq/mer',
        element: (
          <WithAuthLayout>
            <FaqMorePage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'faq/:collectionId',
        element: (
          <WithAuthLayout>
            <FaqResourcePage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'about',
        element: (
          <WithAuthLayout>
            <StudySettingsGate><AboutPage /></StudySettingsGate>
          </WithAuthLayout>
        ),
      },
      {
        path: 'after-treatment',
        element: (
          <WithAuthLayout>
            <AfterTreatmentPage />
          </WithAuthLayout>
        ),
      },
      {
        path: 'welcome',
        element: <WelcomePage />,
      },
      {
        path: 'login',
        element: (
          <LoginLayout>
            <LoginPage />
          </LoginLayout>
        ),
      },
      {
        path: 'login/:token',
        element: (
          <LoginLayout>
            <OTPPage />
          </LoginLayout>
        ),
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
