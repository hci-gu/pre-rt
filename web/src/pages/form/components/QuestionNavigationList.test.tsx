import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FormProvider, useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import type { Questionnaire } from '@/state'
import QuestionNavigationList from './QuestionNavigationList'

// Render the dialog's content in SSR so this tests the real navigation
// component and useQuestions, not a second implementation of its filtering.
vi.mock('@/components/ui/dialog', () => {
  const Children = ({ children }: { children: ReactNode }) => <>{children}</>
  return Object.fromEntries([
    'Dialog', 'DialogClose', 'DialogContent', 'DialogDescription',
    'DialogHeader', 'DialogTitle', 'DialogTrigger',
  ].map((name) => [name, Children]))
})

afterEach(() => vi.unstubAllGlobals())

describe('question menu follows the resolved questionnaire', () => {
  it.each(['sdzkpd49ndccf5b', 'replacement-form'])(
    'includes either dependency branch and stored sections for %s', (id) => {
      vi.stubGlobal('DOMParser', class {
        parseFromString(text: string) {
          return { documentElement: { textContent: text } }
        }
      })
      const questionnaire: Questionnaire = {
        id, name: 'Test', description: '', occurrence: 'daily', dependency: [],
        questions: [
          { id: 'section', type: 'section', text: 'Stored section heading' },
          { id: 'gate', type: 'singleChoice', text: 'Gate question' },
          { id: 'no1', type: 'text', text: 'First no follow-up', dependency: 'gate', dependencyValue: 'Nej' },
          { id: 'no2', type: 'text', text: 'Second no follow-up', dependency: 'gate', dependencyValue: 'Nej' },
          { id: 'yes', type: 'text', text: 'Yes follow-up', dependency: 'gate', dependencyValue: 'Ja' },
          { id: 'added', type: 'text', text: 'Newly added question' },
        ].map((question) => ({ ...question, required: false, followup: [], number: -1 })) as Questionnaire['questions'],
      }
      function Form({ answer }: { answer: string }) {
        const form = useForm({ defaultValues: { gate: answer } })
        return <FormProvider {...form}><QuestionNavigationList questionnaire={questionnaire} /></FormProvider>
      }
      const no = renderToStaticMarkup(<Form answer="Nej" />)
      expect(no).toContain('First no follow-up')
      expect(no).toContain('Second no follow-up')
      expect(no).not.toContain('Yes follow-up')
      expect(no).toContain('Stored section heading')
      expect(no).toContain('Newly added question')
      expect(no.indexOf('First no follow-up')).toBeLessThan(no.indexOf('Second no follow-up'))
      expect(no).not.toContain('Användning av vaginalstav')
      expect(no).not.toContain('Följdfrågor')
      expect(no).toContain('>4.</span>')

      const yes = renderToStaticMarkup(<Form answer="Ja" />)
      expect(yes).toContain('Yes follow-up')
      expect(yes).not.toContain('First no follow-up')
      expect(yes).not.toContain('Second no follow-up')
      expect(yes).toContain('>3.</span>')
    }
  )
})
