import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Question } from '@/state'
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from 'react-hook-form'
import { useSetAtom } from 'jotai'
import { formPageAtom, needsContinueButton } from '../state'
import { DatePicker } from '@/components/ui/date-picker'
import { type MutableRefObject, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Select from './Select'
import { ResourceDrawer } from '@/components/resource'
import AdaptiveQuestionPanel from './AdaptiveQuestionPanel'

const answerChipClassName =
  'question-chip cursor-pointer rounded-xl bg-primary font-bold text-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-data-[state=checked]:bg-study-teal-dark peer-data-[state=checked]:text-white'

const renderQuestionType = (
  question: Question,
  field: ControllerRenderProps<FieldValues, string>,
  onAnswer: (value: unknown) => void,
  onContinue: () => void,
  optionInputRefs: MutableRefObject<(HTMLInputElement | null)[]>
) => {
  switch (question.type) {
    case 'text':
    case 'number':
      return (
        <Input
          placeholder={
            question.placeholder && question.placeholder.length > 0
              ? question.placeholder
              : 'Valfri kommentar'
          }
          type={question.type}
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const target = e.target as HTMLInputElement
              target.blur()
              onContinue()
            }
          }}
          {...field}
        />
      )
    case 'painScale':
      return (
        <RadioGroup
          onValueChange={(value) => {
            field.onChange(value)
            onAnswer(value)
          }}
          defaultValue={field.value}
          className="question-pain-scale"
        >
          {Array.from({ length: 11 }).map((_, index) => (
            <FormItem
              className="question-choice-item"
              key={`${question.id}_pain_${index}`}
            >
              <FormControl>
                <RadioGroupItem
                  value={`${index}`}
                  id={`${question.id}_pain_${index}`}
                  className="peer sr-only"
                />
              </FormControl>
              <FormLabel
                htmlFor={`${question.id}_pain_${index}`}
                className={answerChipClassName}
              >
                {index}
              </FormLabel>
            </FormItem>
          ))}
        </RadioGroup>
      )
    case 'singleChoice':
    case 'multipleChoice':
      return (
        <Select
          question={question}
          field={field}
          onAnswer={onAnswer}
          optionInputRefs={optionInputRefs}
        />
      )
    case 'date':
      return (
        <DatePicker
          date={field.value}
          onChange={(value) => {
            field.onChange(value)
            onAnswer(value)
          }}
        />
      )
    case 'section':
      return (
        <div className="flex justify-center">
          <Button
            className="min-h-14 rounded-xl bg-primary px-7 text-base font-bold text-foreground hover:bg-study-teal-dark hover:text-white"
            onClick={(e) => {
              e.preventDefault()
              onAnswer(null)
            }}
          >
            Gå vidare
          </Button>
        </div>
      )
    default:
      break
  }
}

const QuestionSelector = ({ question, canProceed }: { question: Question; canProceed: boolean }) => {
  const { control } = useFormContext()
  const setPage = useSetAtom(formPageAtom)
  const optionCount = question.options?.value?.length ?? 0
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([])

  if (optionInputRefs.current.length !== optionCount) {
    optionInputRefs.current =
      question.options?.value?.map(
        (_, index) => optionInputRefs.current[index] ?? null
      ) ?? []
  }

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
  }, [])
  const onAnswer = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => setPage((page) => page + 1), 400)
  }
  const onContinue = () => {
    if (!canProceed) return
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setPage((page) => page + 1)
  }

  return (
    <AdaptiveQuestionPanel>
      <FormField control={control} name={question.id} render={({ field }) => (
        <FormItem className="question-card">
          <div className="question-heading-group">
            <div className="question-heading-row">
              <FormLabel className="question-heading">
                {question.type === 'section' ? 'Information' : `Fråga ${question.number}`}
              </FormLabel>
              {question.resource && <ResourceDrawer resource={question.resource} />}
              {!question.resource && question.resourceCollection && (
                <ResourceDrawer resourceCollection={question.resourceCollection} />
              )}
            </div>
            <div className="h-px w-full bg-foreground" />
            <FormLabel className="question-text resource-content"
              dangerouslySetInnerHTML={{ __html: question.text }} />
          </div>
          <FormControl>
            <div className="question-answer">
              {renderQuestionType(question, field, onAnswer, onContinue, optionInputRefs)}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      {needsContinueButton(question) && (
        <div className="question-continue">
          <Button type="button" data-testid="questionnaire-continue"
            className="rounded-xl bg-primary text-base font-bold text-foreground hover:bg-study-teal-dark hover:text-white"
            disabled={!canProceed} onClick={onContinue}>
            Gå vidare
          </Button>
        </div>
      )}
    </AdaptiveQuestionPanel>
  )
}

export default QuestionSelector
