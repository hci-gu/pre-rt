'use client'

import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const normalizeDate = (date: Date | string | undefined) => {
  if (!date) return undefined
  const value = date instanceof Date ? date : new Date(date)

  return Number.isNaN(value.getTime()) ? undefined : value
}

const toDateOnlyValue = (date: Date | undefined) => {
  if (!date) return undefined
  const value = new Date(date)
  value.setHours(12, 0, 0, 0)

  return value
}

export function DatePicker({
  date,
  onChange,
}: {
  date: Date | string | undefined
  onChange: (value: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = normalizeDate(date)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-auto min-h-11 w-[240px] max-w-full justify-start whitespace-normal text-left text-base font-normal',
            !selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'PPP', { locale: sv })
          ) : (
            <span>Välj datum</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] overflow-auto p-0" style={{ maxHeight: 'var(--radix-popover-content-available-height)' }} collisionPadding={8} align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(value) => {
            const dateOnlyValue = toDateOnlyValue(value)

            onChange(dateOnlyValue)
            if (dateOnlyValue) {
              setOpen(false)
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
