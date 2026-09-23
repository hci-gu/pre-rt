import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { Question } from '@/state'
import { forwardRef, useEffect, useRef, useState } from 'react'
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from 'react-hook-form'

const compareOptionValues = (str1: string, str2: string) => {
  if (!str1 || !str2) return false

  const normalize = (str: string) =>
    str.replace(/\{\w+\}/g, '{PLACEHOLDER}')

  return normalize(str1) === normalize(str2)
}

const chipClassName =
  'question-chip cursor-pointer rounded-xl bg-primary text-center font-bold text-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-disabled:cursor-not-allowed peer-disabled:opacity-40 peer-checked:bg-study-teal-dark peer-checked:text-white'

const SelectFollowup = ({
  question,
  index,
  disabled,
}: {
  question: Question
  index: number
  disabled: boolean
}) => {
  const { control } = useFormContext()
  const id = `${question.id}_${index}`
  const options = question.options?.followup ?? []

  return (
    <FormField
      control={control}
      name={id}
      render={({ field }) => (
        <RadioGroup
          disabled={disabled}
          name={id}
          value={field.value}
          defaultValue={field.value}
          className={cn(
            'question-choice-followups',
            disabled && 'opacity-25'
          )}
        >
          {options.map((option, index) => {
            return (
              <FormItem
                className="question-choice-item"
                key={`${id}_${option}_${index}`}
              >
                <FormControl>
                  <input
                    type={'checkbox'}
                    name={id}
                    value={option}
                    id={`${id}_${option}_${index}`}
                    className="peer sr-only"
                    disabled={disabled}
                    onChange={() => {
                      if (disabled) return
                      field.onChange(option)
                    }}
                    checked={option == field.value}
                  />
                </FormControl>
                <label
                  htmlFor={`${id}_${option}_${index}`}
                  className={chipClassName}
                >
                  {option}
                </label>
              </FormItem>
            )
          })}
        </RadioGroup>
      )}
    />
  )
}

interface SelectNumericalInputProps {
  initialValue: string
  disabled: boolean
  updateValue: (value: string) => void
}

const SelectNumericalInput = forwardRef<
  HTMLInputElement,
  SelectNumericalInputProps
>(({ initialValue, disabled, updateValue }, ref) => {
  const [value, setValue] = useState(initialValue ?? '')
  const updateValueRef = useRef(updateValue)

  useEffect(() => {
    updateValueRef.current = updateValue
  }, [updateValue])

  useEffect(() => {
    if (value.length > 0 && !isNaN(Number(value))) {
      updateValueRef.current(value)
    }
  }, [value])

  useEffect(() => {
    if (disabled) {
      setValue('')
    }
  }, [disabled])

  return (
    <Input
      ref={ref}
      type="number"
      pattern="[0-9]*"
      min={0}
      placeholder="0"
      className="mx-2 w-20 max-w-full shrink-0 border-foreground bg-white text-center text-foreground"
      disabled={disabled}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
      }}
    />
  )
})

SelectNumericalInput.displayName = 'SelectNumericalInput'

export default function Select({
  question,
  field,
  onAnswer,
  optionInputRefs,
}: {
  question: Question
  field: ControllerRenderProps<FieldValues, string>
  onAnswer: (value: unknown) => void
  optionInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
}) {
  const { control } = useFormContext()
  const options = question.options?.value ?? []
  const hasFollowupOptions = Boolean(question.options?.followup?.length)
  const stackOptions = options.length > 2
  const stackRows = stackOptions || hasFollowupOptions

  return (
    <RadioGroup
      name={question.id}
      data-can-grid={stackOptions && !hasFollowupOptions}
      value={field.value}
      defaultValue={field.value}
      className={cn(
        'question-choices flex',
        stackRows
          ? 'w-full flex-col items-stretch'
          : 'flex-wrap justify-center',
      )}
    >
      {options.map((option, index) => {
        const updateValue = (value: string, checked: boolean) => {
          const selectedValues = Array.isArray(field.value)
            ? field.value.filter(
                (selectedValue): selectedValue is string =>
                  typeof selectedValue === 'string'
              )
            : []

          if (!checked) {
            // reset optionInputRef value
            if (optionInputRefs.current[index]) {
              optionInputRefs.current[index].value = ''
            }
          }

          if (question.type === 'multipleChoice') {
            const newValue = checked
              ? [
                  ...selectedValues.filter(
                    (val) => !compareOptionValues(val, value)
                  ),
                  value,
                ]
              : selectedValues.filter(
                  (val) => !compareOptionValues(val, value)
                )
            if (question.options?.followup && !checked) {
              control.unregister(`${question.id}_${index}`)
            }
            field.onChange(newValue)
            return
          }

          field.onChange(value)
          const optionContainsInput = option.includes('{AMOUNT}')

          if (!optionContainsInput) {
            onAnswer(value)
          } else {
            optionInputRefs.current[index]?.focus()
          }
        }

        const isChecked =
          question.type === 'singleChoice'
            ? compareOptionValues(field.value, option)
            : Array.isArray(field.value) &&
              field.value.some(
                (val) =>
                  typeof val === 'string' && compareOptionValues(val, option)
              )

        let optionNumericValue = ''
        if (option.includes('{AMOUNT}') && field.value) {
          const optionValue = Array.isArray(field.value)
            ? field.value.find(
                (val) =>
                  typeof val === 'string' && compareOptionValues(val, option)
              )
            : field.value
          if (optionValue) {
            const num = optionValue.match(/\d+/)?.[0]
            optionNumericValue = num
          }
        }

        return (
          <div
            key={`${question.id}_${option}_${index}`}
            className={cn(
              'question-choice-row',
              stackRows && 'w-full'
            )}
            data-followups={hasFollowupOptions}
          >
            <FormItem
              className={cn(
                'question-choice-item',
                stackRows && 'w-full'
              )}
              key={`${question.id}_${option}_${index}`}
            >
              <FormControl>
                <input
                  type={
                    question.type === 'multipleChoice' ? 'checkbox' : 'radio'
                  }
                  name={question.id}
                  value={option}
                  id={`${question.id}-option-${index}`}
                  className="peer sr-only"
                  onChange={(e) => updateValue(option, e.target.checked)}
                  checked={isChecked}
                />
              </FormControl>
              <label
                htmlFor={`${question.id}-option-${index}`}
                className={cn(
                  chipClassName,
                  stackRows && 'w-full'
                )}
              >
                {option.includes('{AMOUNT}') ? (
                  <>
                    <span>{option.split('{AMOUNT}')?.[0]}</span>
                      <SelectNumericalInput
                        initialValue={optionNumericValue}
                        ref={(el) => {
                          optionInputRefs.current[index] = el
                        }}
                        updateValue={(value) => {
                          const optionWithValue = option.replace(
                            '{AMOUNT}',
                            `{${value}}`
                          )
                          updateValue(optionWithValue, true)
                        }}
                        disabled={
                          question.type === 'singleChoice'
                            ? !compareOptionValues(field.value, option)
                            : !Array.isArray(field.value) ||
                              !field.value.some(
                                (val) =>
                                  typeof val === 'string' &&
                                  compareOptionValues(val, option)
                              )
                        }
                      />
                    <span>{option.split('{AMOUNT}')?.[1]}</span>
                  </>
                ) : (
                  <p>
                    {option.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < option.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                )}
              </label>
            </FormItem>
            {hasFollowupOptions && (
              <SelectFollowup
                question={question}
                index={index}
                disabled={!isChecked}
              />
            )}
          </div>
        )
      })}
    </RadioGroup>
  )
}
