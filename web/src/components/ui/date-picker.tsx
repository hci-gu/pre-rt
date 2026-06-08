'use client'

import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function DatePicker({
  date,
  onChange: _onChange,
}: {
  date: Date | undefined
  onChange: (value: Date | undefined) => void
}) {
  return (
    <Button
      variant={'outline'}
      className={cn(
        'w-[240px] justify-start text-left font-normal',
        !date && 'text-muted-foreground'
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP', { locale: sv }) : <span>Välj datum</span>}
    </Button>
  )
}
