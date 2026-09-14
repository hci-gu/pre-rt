import {
  ResourceCollection,
  Resource as ResourceType,
  userDataAtom,
} from '@/state'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Cross1Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { useAtomValue } from 'jotai'
import { Suspense } from 'react'
import ResourceAccordion from './resourceCollection'

export function ResourceDrawer({
  resource,
  resourceCollection,
}:
  | { resource: ResourceType; resourceCollection?: undefined }
  | { resource?: undefined; resourceCollection: ResourceCollection }) {
  const title = resource?.title ?? resourceCollection!.name

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 rounded-full bg-study-coral text-white hover:bg-study-coral/90"
          aria-label={`Visa hjälp: ${title}`}
        >
          <InfoCircledIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-hidden rounded-xl border-0 bg-white p-5 text-foreground sm:p-7">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="h-9 w-9" />
            <DialogTitle className="text-center text-2xl font-black leading-tight sm:text-3xl">
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-primary"
                aria-label="Stäng hjälp"
              >
                <Cross1Icon />
              </Button>
            </DialogClose>
          </div>
          <div className="mt-3 h-px w-full bg-foreground" />
        </DialogHeader>
        <div className="flex max-h-[74vh] flex-col items-center overflow-y-auto pt-4">
          {resource && <Resource resource={resource} />}
          {resourceCollection && (
            <div className="h-full w-full">
              <ResourceAccordion
                collection={resourceCollection}
                showHeader={false}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const replaceTextForUserType = (description: string, type: string) => {
  if (!description) return ''

  let processedText = description

  // Handle both encoded and regular <pre> tags - show for PRE users, hide for others
  if (type === 'PRE') {
    processedText = processedText
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '$1')
      .replace(/<pre>([\s\S]*?)<\/pre>/g, '$1')
  } else {
    processedText = processedText
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '')
      .replace(/<pre>([\s\S]*?)<\/pre>/g, '')
  }

  // Handle both encoded and regular <post> tags - show for POST users, hide for others
  if (type === 'POST') {
    processedText = processedText
      .replace(/&lt;post&gt;([\s\S]*?)&lt;\/post&gt;/g, '$1')
      .replace(/<post>([\s\S]*?)<\/post>/g, '$1')
  } else {
    processedText = processedText
      .replace(/&lt;post&gt;([\s\S]*?)&lt;\/post&gt;/g, '')
      .replace(/<post>([\s\S]*?)<\/post>/g, '')
  }

  return processedText
}

export default function Resource({ resource }: { resource: ResourceType }) {
  const userData = useAtomValue(userDataAtom)

  const description = replaceTextForUserType(
    resource.description,
    userData?.type ?? ''
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div
        className="resource-content [&_a]:text-study-link-blue [&_a]:underline [&_a]:decoration-study-link-blue/60 [&_a]:underline-offset-2 [&_a]:hover:decoration-study-link-blue [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_p]:font-light [&_p]:text-base"
        dangerouslySetInnerHTML={{
          __html: description,
        }}
      ></div>
    </Suspense>
  )
}
