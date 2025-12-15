import { Resource as ResourceType, userDataAtom } from '@/state'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Cross1Icon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { useAtomValue } from 'jotai'
import { Suspense } from 'react'

export function ResourceDrawer({ resource }: { resource: ResourceType }) {
  return (
    <Drawer>
      <DrawerTrigger>
        <Button size="icon">
          <InfoCircledIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="sm:m-16 h-4/5">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <DrawerClose>
              <Button
                variant="outline"
                size="icon"
                className="border-foreground"
              >
                <Cross1Icon />
              </Button>
            </DrawerClose>
            <DrawerTitle>{resource.title}</DrawerTitle>
            <div></div>
          </div>
        </DrawerHeader>
        <div className="p-8 flex flex-col justify-center items-center overflow-y-scroll">
          <Resource resource={resource} />
        </div>
      </DrawerContent>
    </Drawer>
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
        className="[&_a]:text-primary [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_p]:font-light [&_p]:text-base"
        dangerouslySetInnerHTML={{
          __html: description,
        }}
      ></div>
    </Suspense>
  )
}
