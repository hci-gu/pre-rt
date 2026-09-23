import { type ComponentProps, type ReactNode } from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Reserve a separate row for dismissal. Neither a long title nor a scrolling
// question/resource can displace or paint over the close button.
export default function QuestionnaireDialogContent({
  children,
  className,
  closeLabel = 'Stäng frågor',
  leadingAction,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, 'showCloseButton'> & { closeLabel?: string; leadingAction?: ReactNode }) {
  return (
    <DialogContent {...props} showCloseButton={false}
      className={cn('questionnaire-dialog rounded-xl border-0 bg-background text-foreground', className)}>
      <div className="questionnaire-dialog-controls">
        {leadingAction && <div className="questionnaire-dialog-leading-action">{leadingAction}</div>}
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={closeLabel}>
            <Cross1Icon />
          </Button>
        </DialogClose>
      </div>
      <div className="questionnaire-dialog-scroll">{children}</div>
    </DialogContent>
  )
}
