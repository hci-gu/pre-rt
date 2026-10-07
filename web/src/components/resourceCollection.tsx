import { ResourceCollection, userDataAtom } from '@/state'
import { useAtomValue } from 'jotai'
import { Suspense, useMemo } from 'react'
import ConnectedResourceContent from './resource-content/connected'
import { sanitizeLegacyResourceHTML } from './resource-content/legacy-html'
import { resourceAnchor, resolveAnchor, audienceMatches } from './resource-content/model'
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
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
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
          <ResourceAccordion collection={collection} showHeader={false} syncLocation={false} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const ResourceSection = ({ text }: { text: string }) => {
  return (
    <div className="mb-4">
      <h2 className="text-3xl font-black leading-tight">{text}</h2>
    </div>
  )
}

// Store reading positions per history entry, so Back returns to the paragraph
// the reader left. Accordion toggles keep the current entry and scroll position.
const readingPositions = new Map<string, number>()

export default function ResourceAccordion({
  collection,
  showHeader = true,
  syncLocation = true,
}: {
  collection: ResourceCollection
  showHeader?: boolean
  syncLocation?: boolean
}) {
  const user = useAtomValue(userDataAtom)
  const visibleResources = useMemo(() => collection.resources.filter(resource => !resource.archived && audienceMatches(resource.content?.audience, user)), [collection.resources, user])
  const location = useLocation()
  const navigationType = useNavigationType()
  const root = useRef<HTMLDivElement>(null)
  const [openResource, setOpenResource] = useState(() =>
    syncLocation ? resolveAnchor(location.hash.slice(1), visibleResources) : '')
  const pendingScroll = useRef(false)

  useLayoutEffect(() => {
    if (!syncLocation) return
    setOpenResource(resolveAnchor(location.hash.slice(1), visibleResources))
    pendingScroll.current = true
  }, [location.key, location.hash, visibleResources, syncLocation])

  useLayoutEffect(() => {
    if (!syncLocation) return
    let lastPosition = window.scrollY
    const remember = () => { lastPosition = window.scrollY }
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      window.removeEventListener('scroll', remember)
      // A first load is also reported as POP. Only cache a history entry when
      // it is actually left, not while its initial hash/content is settling.
      if ((history.state?.key || 'default') !== location.key) readingPositions.set(location.key, lastPosition)
    }
  }, [location.key, syncLocation])

  useEffect(() => {
    if (!syncLocation || !pendingScroll.current ||
        openResource !== resolveAnchor(location.hash.slice(1), visibleResources)) return
    const saved = navigationType === 'POP' ? readingPositions.get(location.key) : undefined
    let cancelled = false
    let revision = 0
    const restore = async () => {
      const currentRevision = ++revision
      // Wait for the expanding panel, and retry when async resource content,
      // illustrations or fonts change its height. Stop as soon as the reader
      // interacts; background layout must not fight deliberate scrolling.
      await Promise.allSettled((root.current?.getAnimations({ subtree: true }) || []).map(animation => animation.finished))
      if (cancelled || currentRevision !== revision) return
      pendingScroll.current = false
      if (saved !== undefined) {
        window.scrollTo({ top: saved, behavior: 'instant' })
      } else if (openResource) {
        const element = root.current?.querySelector<HTMLElement>(`[id="${CSS.escape(openResource)}"]`)
        if (element) {
          const headerHeight = document.querySelector('header')?.getBoundingClientRect().height || 0
          window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - headerHeight - 16, behavior: 'instant' })
        }
      } else if (!location.hash && navigationType !== 'POP') {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }
    const frame = requestAnimationFrame(restore)
    const observer = new ResizeObserver(restore)
    if (root.current) observer.observe(root.current)
    const stop = () => { cancelled = true; observer.disconnect(); cancelAnimationFrame(frame) }
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    events.forEach(event => window.addEventListener(event, stop, { passive: true }))
    void document.fonts.ready.then(restore)
    return () => {
      stop()
      events.forEach(event => window.removeEventListener(event, stop))
    }

  }, [openResource, location.key, location.hash, navigationType, visibleResources, syncLocation])

  const resourceClicked = (value: string | undefined) => {
    const nextValue = value ?? ''
    setOpenResource(nextValue)
    if (syncLocation) {
      const url = `${window.location.pathname}${window.location.search}${nextValue ? `#${nextValue}` : ''}`
      // Retain React Router's history key/index. Do not scroll on an ordinary
      // toggle or add an extra Back step for every opened answer.
      history.replaceState(history.state, '', url)
      readingPositions.set(location.key, window.scrollY)
      if (readingPositions.size > 100) readingPositions.delete(readingPositions.keys().next().value!)
    }
  }

  if (collection.archived || !audienceMatches(collection.content?.audience, user)) return null

  return (
    <div ref={root} className={collection.showQuickExit && syncLocation ? 'pb-24' : undefined}>
      <div>
        {showHeader && <ResourceSection text={collection.name} />}
      </div>
      <Accordion
        type="single"
        collapsible
        value={openResource}
        onValueChange={resourceClicked}
        className="space-y-4"
      >
        {collection.content ? <Suspense fallback={<p>Laddar innehåll…</p>}><ConnectedResourceContent content={collection.content} bindings={collection.bindings} /></Suspense> : collection.description && (
          <div
            className="resource-content rounded-xl bg-white px-5 py-4 text-base leading-relaxed [&_a]:text-study-link-blue [&_a]:underline [&_a]:decoration-study-link-blue/60 [&_a]:underline-offset-2 [&_a]:hover:decoration-study-link-blue [&_li]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{
              __html: sanitizeLegacyResourceHTML(collection.description ?? ''),
            }}
          />
        )}
        {visibleResources.map((resource) => (
          <AccordionItem
            value={resourceAnchor(resource)}
            key={resource.id}
            id={resourceAnchor(resource)}
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
      </Accordion>
      {collection.showQuickExit && syncLocation && <AbortButton />}
      {collection.content ? <Suspense fallback={<p>Laddar innehåll…</p>}><ConnectedResourceContent content={collection.content} bindings={collection.bindings} footer /></Suspense> : collection.footerContent && <div className="resource-content mt-6" dangerouslySetInnerHTML={{ __html: sanitizeLegacyResourceHTML(collection.footerContent) }} />}
    </div>
  )
}
