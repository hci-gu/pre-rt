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
    <div className="mb-4 bg-primary text-center py-2">
      <h2 className="text-md font-bold text-white">{text.toUpperCase()}</h2>
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

  // Log when the element with the specified ID is scrolled into view
  useEffect(() => {
    if (collection.id !== 'pa74h4k8j8d8pn3') return

    const slug = collection.resources[0]
      ? titleToSlug(collection.resources[0].title)
      : null
    if (!slug) return
    const element = document.getElementById(slug)
    if (!element) return

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowAbort(true)
          } else {
            setShowAbort(false)
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
      {showHeader && <ResourceSection text={collection.name} />}
      <Accordion
        type="single"
        collapsible
        value={openResource}
        onValueChange={resourceClicked}
      >
        <div
          className="[&_a]:text-primary [&_a]:hover:underline [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2 [&_p]:font-light [&_p]:text-base p-4"
          dangerouslySetInnerHTML={{
            __html: collection.description ?? '',
          }}
        ></div>
        {collection.resources.map((resource, index) => (
          <AccordionItem
            value={titleToSlug(resource.title)}
            key={`Resource_${index}`}
            id={titleToSlug(resource.title)}
            className="scroll-mt-24"
          >
            <AccordionTrigger className="text-lg mx-4">
              {resource.title}
            </AccordionTrigger>
            <AccordionContent className="shadow-inner px-4 py-8 bg-card">
              <Resource resource={resource} />
            </AccordionContent>
          </AccordionItem>
        ))}
        {showAbort && <AbortButton />}
      </Accordion>
    </>
  )
}
