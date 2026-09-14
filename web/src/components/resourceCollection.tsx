import { ResourceCollection } from '@/state'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { useEffect, useRef, useState } from 'react'
import Resource from './resource'
import { Button } from './ui/button'
import { Cross1Icon } from '@radix-ui/react-icons'
import AbortButton from './ui/AbortButton'

export function ResourceCollectionDrawer({
  collection,
  buttonText,
}: {
  collection: ResourceCollection
  buttonText: string
}) {
  return (
    <Drawer>
      <DrawerTrigger>
        <Button>{buttonText}</Button>
      </DrawerTrigger>
      <DrawerContent className="sm:m-16 h-full">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <DrawerClose>
              <Button variant="outline" size="icon">
                <Cross1Icon />
              </Button>
            </DrawerClose>
            <DrawerTitle>{collection.name}</DrawerTitle>
          </div>
        </DrawerHeader>
        <div className="p-8 overflow-y-scroll">
          <ResourceAccordion collection={collection} showHeader={false} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const titleToSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[åäàáâãæ]/g, 'a')
    .replace(/[öòóôõø]/g, 'o')
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/-+/g, '')
    .replace(/\s+/g, '-')
    .trim()

const ResourceSection = ({ text }: { text: string }) => {
  return (
    <div className="mb-4">
      <h2 className="text-3xl font-black leading-tight">{text}</h2>
    </div>
  )
}

export default function ResourceAccordion({
  collection,
  showHeader = true,
}: {
  collection: ResourceCollection
  showHeader?: boolean
}) {
  const [openResource, setOpenResource] = useState<string>(
    window.location.hash.replace('#', '')
  )
  const [showAbort, setShowAbort] = useState(false)
  const violenceSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setShowAbort(false)
    if (!collection.showQuickExit) return
    const element = violenceSectionRef.current
    if (!element) return

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowAbort(true)
          }
        })
      },
      {
        threshold: 0.1,
      }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [collection])

  const scrollTimeout = useRef<number | null>(null)
  const isFirstRender = useRef(true)

  const updateUrlHash = (slug: string) => {
    const url = `${window.location.pathname}${window.location.search}${
      slug ? `#${slug}` : ''
    }`

    history.replaceState(null, '', url)
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')

      setOpenResource(hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!openResource) {
      return
    }

    const behavior = isFirstRender.current ? 'auto' : 'smooth'
    const delay = isFirstRender.current ? 0 : 220

    if (scrollTimeout.current) {
      window.clearTimeout(scrollTimeout.current)
    }

    scrollTimeout.current = window.setTimeout(() => {
      const element = document.getElementById(openResource)

      if (element) {
        element.scrollIntoView({
          behavior,
          block: 'start',
          inline: 'nearest',
        })
      }
    }, delay)

    isFirstRender.current = false

    return () => {
      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current)
      }
    }
  }, [openResource])

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current)
      }
    }
  }, [])

  const resourceClicked = (value: string | undefined) => {
    const nextValue = value ?? ''

    setOpenResource(nextValue)

    updateUrlHash(nextValue)
  }

  return (
    <>
      <div ref={violenceSectionRef}>
        {showHeader && <ResourceSection text={collection.name} />}
      </div>
      <Accordion
        type="single"
        collapsible
        value={openResource}
        onValueChange={resourceClicked}
        className="space-y-4"
      >
        {collection.description && (
          <div
            className="resource-content rounded-xl bg-white px-5 py-4 text-base font-bold leading-relaxed [&_a]:text-study-link-blue [&_a]:underline [&_a]:decoration-study-link-blue/60 [&_a]:underline-offset-2 [&_a]:hover:decoration-study-link-blue [&_li]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{
              __html: collection.description ?? '',
            }}
          />
        )}
        {(collection.resources ?? []).map((resource) => (
          <AccordionItem
            value={titleToSlug(resource.title)}
            key={resource.id}
            id={titleToSlug(resource.title)}
            className="scroll-mt-24 border-0"
          >
            <AccordionTrigger className="group rounded-xl bg-primary px-5 py-4 text-left text-lg font-black text-foreground hover:no-underline">
              <span>{resource.title}</span>
            </AccordionTrigger>
            <AccordionContent className="mt-2 rounded-xl bg-white px-5 py-6">
              <div className="max-w-none">
                <Resource resource={resource} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {showAbort && <AbortButton />}
      </Accordion>
    </>
  )
}
