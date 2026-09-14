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
import { formPageAtom } from '../state'
import { DatePicker } from '@/components/ui/date-picker'
import { type MutableRefObject, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Select from './Select'
import { ResourceDrawer } from '@/components/resource'
import { cn } from '@/lib/utils'

const answerChipClassName =
  'flex min-h-14 min-w-14 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-3 text-base font-bold text-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-data-[state=checked]:bg-study-teal-dark peer-data-[state=checked]:text-white sm:min-w-16'

const renderQuestionType = (
  question: Question,
  field: ControllerRenderProps<FieldValues, string>,
  onAnswer: (value: unknown) => void,
  optionInputRefs: MutableRefObject<(HTMLInputElement | null)[]>,
  denseChoices = false
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
              onAnswer(e)
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
          className="flex max-w-full flex-wrap justify-center gap-2 sm:gap-3"
        >
          {Array.from({ length: 11 }).map((_, index) => (
            <FormItem
              className="flex items-center"
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
          dense={denseChoices}
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

const QuestionSelector = ({ question }: { question: Question }) => {
  const { control } = useFormContext()
  const setPage = useSetAtom(formPageAtom)
  const plainTextLength = question.text
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;\s]+;/g, ' ')
    .trim().length
  const optionCount = question.options?.value?.length ?? 0
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([])

  if (optionInputRefs.current.length !== optionCount) {
    optionInputRefs.current =
      question.options?.value?.map(
        (_, index) => optionInputRefs.current[index] ?? null
      ) ?? []
  }

  const isChoiceQuestion =
    question.type === 'singleChoice' || question.type === 'multipleChoice'
  const useDenseChoiceLayout = isChoiceQuestion && optionCount > 4
  const useCompactText = plainTextLength > 250

  const onAnswer = () => {
    setTimeout(() => setPage((page) => page + 1), 400)
  }

  return (
    <section
      className={cn(
        'flex h-full w-full items-center justify-center bg-background px-0 sm:px-8 lg:px-16',
        useDenseChoiceLayout
          ? 'pb-6 pt-36 sm:pb-8 sm:pt-[9.25rem] lg:pt-[9.25rem]'
          : 'pb-8 pt-44 lg:pt-[9.875rem]'
      )}
    >
      <FormField
        control={control}
        name={question.id}
        render={({ field }) => (
          <FormItem
            className={cn(
              'w-full max-w-[38.75rem] bg-white text-center shadow-sm',
              useDenseChoiceLayout
                ? 'min-h-0 max-h-[calc(100dvh-10.5rem)] overflow-y-auto px-5 py-5 sm:max-h-[calc(100dvh-11.25rem)] sm:px-10 sm:py-6'
                : 'min-h-[24rem] px-6 py-10 sm:px-12'
            )}
          >
            <div
              className={cn(
                'flex flex-col items-center',
                useDenseChoiceLayout ? 'gap-2' : 'gap-4'
              )}
            >
              <div className="relative flex w-full items-start justify-center gap-2">
                <FormLabel
                  className={cn(
                    'font-black leading-none text-foreground',
                    useDenseChoiceLayout ? 'text-2xl' : 'text-3xl'
                  )}
                >
                  {question.type === 'section'
                    ? 'Information'
                    : `Fråga ${question.number}`}
                </FormLabel>
                <div className="absolute right-0 top-0">
                  {question.resource && (
                    <ResourceDrawer resource={question.resource} />
                  )}
                  {!question.resource &&
                    question.resourceCollection && (
                    <ResourceDrawer
                      resourceCollection={question.resourceCollection}
                    />
                  )}
                </div>
              </div>
              <div className="h-px w-full bg-foreground" />
              <FormLabel
                className={cn(
                  'mx-auto max-w-2xl font-black text-foreground',
                  useDenseChoiceLayout
                    ? 'text-base leading-snug sm:text-lg'
                    : useCompactText
                      ? 'text-base leading-snug sm:text-lg'
                      : 'text-xl leading-snug'
                )}
                dangerouslySetInnerHTML={{
                  __html: `${question.text}`,
                }}
              />
            </div>
            <FormControl>
              <div
                className={cn(
                  'flex max-w-full justify-center',
                  useDenseChoiceLayout ? 'mt-6' : 'mt-8'
                )}
              >
                {renderQuestionType(
                  question,
                  field,
                  onAnswer,
                  optionInputRefs,
                  useDenseChoiceLayout
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      ></FormField>
    </section>
  )
}

export default QuestionSelector
