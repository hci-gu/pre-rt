import { useLayoutEffect, useRef, type ReactNode } from 'react'

export default function AdaptiveQuestionPanel({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const viewport = viewportRef.current!
    const scroll = scrollRef.current!
    const content = contentRef.current!
    let frame = 0
    let disposed = false
    const fit = () => {
      if (disposed) return
      // Measure real rendered content, not option count or character heuristics.
      // Try normal typography first; small screens may reduce it by up to 12.5%
      // before falling back to a single scroll area. Touch targets stay at 44px.
      const padding = getComputedStyle(viewport)
      const available = viewport.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom)
      const screenWidth = window.visualViewport?.width ?? window.innerWidth
      const screenHeight = window.visualViewport?.height ?? window.innerHeight
      const smallScreen = screenWidth <= 480 || (screenWidth <= 940 && screenHeight <= 480)
      const layouts = [
        { density: 'comfortable', fontScale: 1 },
        { density: 'compact', fontScale: 1 },
        { density: 'tight', fontScale: 1 },
        ...(smallScreen ? [{ density: 'tight', fontScale: .9375 }, { density: 'tight', fontScale: .875 }] : []),
      ]
      for (const { density, fontScale } of layouts) {
        viewport.dataset.density = density
        viewport.dataset.fontScale = String(fontScale)
        viewport.style.setProperty('--question-font-scale', String(fontScale))
        viewport.dataset.choiceColumns = '1'
        const singleColumnHeight = content.getBoundingClientRect().height
        if (singleColumnHeight <= available + 1 && scroll.scrollHeight <= scroll.clientHeight) break
        const choices = content.querySelector<HTMLElement>('[data-can-grid="true"]')
        const minimumColumnWidth = parseFloat(getComputedStyle(document.documentElement).fontSize) * fontScale * 7
        if (choices && choices.clientWidth >= minimumColumnWidth * 2 + parseFloat(getComputedStyle(choices).gap)) {
          viewport.dataset.choiceColumns = '2'
          const gridHeight = content.getBoundingClientRect().height
          const splitsWords = Array.from(choices.querySelectorAll<HTMLElement>('.question-chip'))
            .some(chip => chip.scrollWidth > chip.clientWidth + 1)
          if (!splitsWords && gridHeight <= available + 1 && scroll.scrollHeight <= scroll.clientHeight) break
          // If neither fits, keep the more compact layout for native scrolling.
          if (splitsWords || gridHeight >= singleColumnHeight) viewport.dataset.choiceColumns = '1'
        }
      }
      viewport.dataset.overflow = String(scroll.scrollHeight > scroll.clientHeight + 1)
      const active = document.activeElement
      if (active instanceof HTMLInputElement && active.type !== 'radio' && active.type !== 'checkbox' && scroll.contains(active)) {
        active.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
    const scheduleFit = () => {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    }
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleFit)
    observer?.observe(viewport)
    observer?.observe(content)
    // Images, rich content, fonts and inline follow-up controls may change size.
    document.fonts?.ready.then(scheduleFit)
    window.addEventListener('resize', scheduleFit)
    window.visualViewport?.addEventListener('resize', scheduleFit)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleFit)
      window.visualViewport?.removeEventListener('resize', scheduleFit)
    }
  }, [])

  return (
    <section ref={viewportRef} className="question-viewport" data-density="comfortable">
      <div ref={scrollRef} className="question-scroll" tabIndex={0} role="region" aria-label="Aktuell fråga" data-testid="question-scroll">
        <div ref={contentRef} className="question-content">{children}</div>
      </div>
    </section>
  )
}
