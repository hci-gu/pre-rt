import {
  ResourceCollection,
  Resource as ResourceType,
  userDataAtom,
} from '@/state'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAtomValue } from 'jotai'
import { Suspense } from 'react'
import ResourceAccordion from './resourceCollection'
import ConnectedResourceContent from './resource-content/connected'
import { audienceMatches } from './resource-content/model'
import { sanitizeLegacyResourceHTML } from './resource-content/legacy-html'
import QuestionnaireDialogContent from '@/pages/form/components/QuestionnaireDialogContent'
import { QuestionnaireQuickExit } from '@/pages/form/questionnaire-safety'

export function ResourceDrawer({
  resource,
  resourceCollection,
}:
  | { resource: ResourceType; resourceCollection?: undefined }
  | { resource?: undefined; resourceCollection: ResourceCollection }) {
  const user = useAtomValue(userDataAtom)
  const item = resource || resourceCollection
  if (item?.archived || !audienceMatches(item?.content?.audience, user)) return null
  const title = resource?.title ?? resourceCollection!.name

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="group h-11 w-11 shrink-0 rounded-full p-0 hover:bg-transparent"
          aria-label={`Visa hjälp: ${title}`}
        >
          <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff9699] font-serif text-xl font-bold leading-none text-white group-hover:bg-[#f58286]">
            i
          </span>
        </Button>
      </DialogTrigger>
      <QuestionnaireDialogContent leadingAction={<QuestionnaireQuickExit />} closeLabel="Stäng hjälp" aria-describedby={undefined} className="bg-white">
        <DialogHeader>
          <DialogTitle className="min-w-0 text-center text-xl font-black leading-tight">
            {title}
          </DialogTitle>
          <div className="mt-3 h-px w-full bg-foreground" />
        </DialogHeader>
        <div className="min-w-0 pt-4">
          {resource && <Resource resource={resource} />}
          {resourceCollection && (
            <div className="h-full w-full">
              <ResourceAccordion
                collection={resourceCollection}
                showHeader={false}
                syncLocation={false}
              />
            </div>
          )}
        </div>
      </QuestionnaireDialogContent>
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

  if (resource.archived || !audienceMatches(resource.content?.audience, userData)) return null
  if (resource.content) return <Suspense fallback={<p>Laddar innehåll…</p>}><ConnectedResourceContent content={resource.content} bindings={resource.bindings} /></Suspense>

  const description = replaceTextForUserType(
    resource.description,
    userData?.type ?? ''
  )

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div
        className="resource-content [&_a]:text-study-link-blue [&_a]:underline [&_a]:decoration-study-link-blue/60 [&_a]:underline-offset-2 [&_a]:hover:decoration-study-link-blue [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_p]:font-light [&_p]:text-base"
        dangerouslySetInnerHTML={{
          __html: sanitizeLegacyResourceHTML(description),
        }}
      ></div>
    </Suspense>
  )
}
