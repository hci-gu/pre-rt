import { createContext, useContext, type ReactNode } from 'react'
import { useAtomValue } from 'jotai'
import type { Question, Questionnaire } from '@/state'
import { QUESTIONNAIRE_FOV_ID, QUESTIONNAIRE_PCL5_ID } from '@/constants'
import useQuestions from './hooks/useQuestions'
import { formPageAtom } from './state'
import AbortButton from '@/components/ui/AbortButton'

export function isSensitivePage(form: Questionnaire, questions: Question[], page: number) {
  if (page < 0) return false
  const current = questions[Math.min(page, questions.length - 1)]
  const section = questions.slice(0, page + 1).reverse().find(q => q.type === 'section')
  if (section?.id === QUESTIONNAIRE_FOV_ID || section?.id.includes(QUESTIONNAIRE_PCL5_ID)) return true
  // The PCL closing section has its own ID. Follow-up membership, rather than
  // the most recent heading alone, keeps both it and submission protected.
  if (form.questions.some(q => q.id === QUESTIONNAIRE_PCL5_ID)) return true
  return form.followup?.some(f => f.questions.some(q => q.id === QUESTIONNAIRE_PCL5_ID) &&
    current?.id.startsWith(`followup_${f.id}_`)) ?? false
}

const SafetyContext = createContext<{ questionnaire: Questionnaire; active: boolean; sensitiveNavigation: boolean } | null>(null)

export function QuestionnaireSafetyProvider({ questionnaire, children }: { questionnaire: Questionnaire; children: ReactNode }) {
  const questions = useQuestions(questionnaire)
  const page = useAtomValue(formPageAtom)
  const sensitiveNavigation = questions.some(q => q.id === QUESTIONNAIRE_FOV_ID || q.id.includes(QUESTIONNAIRE_PCL5_ID))
  return <SafetyContext.Provider value={{ questionnaire, active: isSensitivePage(questionnaire, questions, page), sensitiveNavigation }}>{children}</SafetyContext.Provider>
}

export const useQuestionnaireSafety = () => useContext(SafetyContext)

export function QuestionnaireQuickExit({ navigation = false }: { navigation?: boolean }) {
  const safety = useQuestionnaireSafety()
  return safety && (safety.active || (navigation && safety.sensitiveNavigation))
    ? <AbortButton questionnaire={safety.questionnaire} inline /> : null
}
