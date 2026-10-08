import { authAtom, pb, type Questionnaire } from '@/state'
import { useForm, useFormContext, useWatch } from 'react-hook-form'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useLocation } from 'react-router-dom'
import { formPageAtom } from '../state'
import useQuestions from './useQuestions'
import { questionnaireDraftKey, readQuestionnaireDraft, saveQuestionnaireDraft } from '@/lib/questionnaire-drafts'

export function questionnaireDate(search = window.location.search) {
  const raw = new URLSearchParams(search).get('date')
  if (!raw) return new Date()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(raw + 'T12:00:00') : new Date(NaN)
  if (Number.isNaN(date.getTime()) || [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-') !== raw) {
    throw new Error('Ogiltigt formulärdatum')
  }
  return date
}

// Shared with quick exit/debug controls; hooks use the reactive authenticated ID.
export const keyForQuestionnaire = (questionnaire: Questionnaire, date = questionnaireDate(), userId = pb.authStore.model?.id ?? '') =>
  questionnaireDraftKey(questionnaire, userId, date)

export function useQuestionnaireDraftKey(questionnaire: Questionnaire) {
  const auth = useAtomValue(authAtom)
  const { search } = useLocation()
  return questionnaireDraftKey(questionnaire, auth?.id ?? '', questionnaireDate(search))
}

const useFormStateWithCache = ({ questionnaire }: { questionnaire: Questionnaire }) => {
  const key = useQuestionnaireDraftKey(questionnaire)
  // The form is remounted when the participant or selected date changes.
  const [draft] = useState(() => readQuestionnaireDraft(key))
  return useForm({ defaultValues: draft?.answers ?? {} })
}

export const useScrollToLastAnsweredQuestion = (questionnaire: Questionnaire) => {
  const setPage = useSetAtom(formPageAtom)
  const questions = useQuestions(questionnaire)
  const key = useQuestionnaireDraftKey(questionnaire)
  const initialized = useRef(false)
  useLayoutEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const draft = readQuestionnaireDraft(key)
    setPage(draft ? Math.max(-1, Math.min(draft.page, questions.length)) : -1)
  }, [key, questions.length, setPage])
}

export const SyncFormStateToLocalStorage = ({ questionnaire, started }: { questionnaire: Questionnaire; started: string | null }) => {
  const { control } = useFormContext()
  const values = useWatch({ control })
  const page = useAtomValue(formPageAtom)
  const key = useQuestionnaireDraftKey(questionnaire)
  useEffect(() => { saveQuestionnaireDraft(key, { answers: values, page, started }) }, [key, values, page, started])
  return null
}

export default useFormStateWithCache
