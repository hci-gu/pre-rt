import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { Question } from '@/state'
import { forwardRef, useEffect, useState } from 'react'
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from 'react-hook-form'

const SelectFollowup = ({
  question,
  index,
  disabled,
}: {
  question: Question
  index: number
  field: ControllerRenderProps<FieldValues, any>
  disabled: boolean
  onAnswer: (value: any) => void
  optionInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
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
          className={`flex flex-wrap gap-1 sm:gap-2 leading-tight sm:leading-normal justify-end ${
            disabled && `opacity-50`
          }`}
        >
          {options.map((option, index) => {
            return (
              <FormItem
                className="flex items-center"
                key={`${id}_${option}_${index}`}
              >
                <FormControl>
                  <input
                    type={'checkbox'}
                    name={id}
                    value={option}
                    id={`${id}_${option}_${index}`}
                    className="hidden peer"
                    onChange={(_) => {
                      if (disabled) return
                      field.onChange(option)
                    }}
                    checked={option == field.value}
                  />
                </FormControl>
                <label
                  htmlFor={`${id}_${option}_${index}`}
                  className="flex items-center justify-center px-1 py-1 border-2 border-foreground rounded-lg cursor-pointer peer-checked:primary peer-checked:primary-100 peer-checked:font-semibold transition-colors duration-200 sm:px-6 sm:py-3"
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

  useEffect(() => {
    if (value.length > 0 && !isNaN(Number(value))) {
      updateValue(value)
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
      className="w-16 h-6 mx-2"
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
  field: ControllerRenderProps<FieldValues, any>
  onAnswer: (value: any) => void
  optionInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
}) {
  const { control } = useFormContext()
  const options = question.options?.value ?? []

  return (
    <RadioGroup
      name={question.id}
      value={field.value}
      defaultValue={field.value}
      className={`flex flex-wrap gap-2 sm:gap-4 leading-tight sm:leading-normal ${
        question.options?.followup?.length && 'flex-col items-start'
      }`}
    >
      {options.map((option, index) => {
        const compareOptionValues = (str1: string, str2: string) => {
          if (!str1 || !str2) return false

          const normalize = (str: string) =>
            str.replace(/\{\w+\}/g, '{PLACEHOLDER}')

          return normalize(str1) === normalize(str2)
        }

        const updateValue = (value: string, checked: boolean) => {
          if (!checked) {
            // reset optionInpurRef value
            if (optionInputRefs.current[index]) {
              optionInputRefs.current[index].value = ''
            }
          }

          if (question.type === 'multipleChoice') {
            field.value = field.value || []

            const newValue = checked
              ? [
                  ...field.value.filter(
                    (val: any) => !compareOptionValues(val, value)
                  ),
                  value,
                ]
              : field.value.filter(
                  (val: any) => !compareOptionValues(val, value)
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
            : field.value?.some((val: string) =>
                compareOptionValues(val, option)
              )

        let optionNumericValue = ''
        if (option.includes('{AMOUNT}') && field.value) {
          const optionValue = field.value.find
            ? field.value?.find((val: string) =>
                compareOptionValues(val, option)
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
            className={`flex gap-4 items-center ${
              question.options?.followup && `justify-between w-full`
            }`}
          >
            <FormItem
              className="flex items-center"
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
                  className="hidden peer"
                  onChange={(e) => updateValue(option, e.target.checked)}
                  checked={isChecked}
                />
              </FormControl>
              <label
                htmlFor={`${question.id}-option-${index}`}
                className="bg-card flex items-center justify-center px-2 py-2 border-2 border-foreground rounded-lg cursor-pointer peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:font-semibold transition-colors duration-200 sm:px-6 sm:py-3"
              >
                {option.split('{AMOUNT}')?.[0]}
                {option.split('{AMOUNT}')?.[1] && (
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
                        : !field.value ||
                          !field.value.some((val: any) =>
                            compareOptionValues(val, option)
                          )
                    }
                  />
                )}
                {option.split('{AMOUNT}')?.[1]}
              </label>
            </FormItem>
            {question.options?.followup && (
              <SelectFollowup
                question={question}
                index={index}
                disabled={!isChecked}
                field={field}
                onAnswer={onAnswer}
                optionInputRefs={optionInputRefs}
              />
            )}
          </div>
        )
      })}
    </RadioGroup>
  )
}
