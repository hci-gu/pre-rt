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
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import Select from './Select'
import { ResourceDrawer } from '@/components/resource'

const renderQuestionType = (
  question: Question,
  field: ControllerRenderProps<FieldValues, any>,
  onAnswer: (value: any) => void
) => {
  const options = question.options?.value
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>(
    options?.map(() => null) ?? []
  )

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
          className="flex flex-wrap"
        >
          {Array.from({ length: 11 }).map((_, index) => (
            <FormItem className="flex items-center space-x-3 space-y-0 flex-wrap">
              <FormControl>
                {/* @ts-ignore */}
                <RadioGroupItem value={index} />
              </FormControl>
              <FormLabel className="font-normal">{index}</FormLabel>
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
  const useCompactText = plainTextLength > 250

  const onAnswer = (_: any) => {
    setTimeout(() => setPage((page) => page + 1), 400)
  }

  return (
    <section className="h-full w-full flex items-center justify-center px-4 md:px-16 sm:px-8">
      <FormField
        control={control}
        name={question.id}
        render={({ field }) => (
          <FormItem>
            <div
              className={`flex ${
                useCompactText ? 'gap-0.5 sm:gap-2' : 'gap-1 sm:gap-2'
              }`}
            >
              {question.type !== 'section' && (
                <FormLabel
                  className={
                    useCompactText
                      ? 'text-xs sm:text-xl leading-tight sm:leading-normal'
                      : 'text-sm sm:text-xl leading-snug sm:leading-normal'
                  }
                >
                  {question.number}.
                </FormLabel>
              )}
              {question.required && <span className="text-red-500">*</span>}
              <FormLabel
                className={`max-w-6xl ${
                  useCompactText
                    ? 'text-xs sm:text-xl leading-tight sm:leading-normal'
                    : 'text-sm sm:text-xl leading-snug sm:leading-normal'
                }`}
                dangerouslySetInnerHTML={{
                  __html: `${question.text}`,
                }}
              />
              {question.resource && (
                <ResourceDrawer resource={question.resource} />
              )}
              {!question.resource && question.resourceCollection && (
                <ResourceDrawer
                  resourceCollection={question.resourceCollection}
                />
              )}
            </div>
            <FormControl>
              {renderQuestionType(question, field, onAnswer)}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      ></FormField>
    </section>
  )
}

export default QuestionSelector
