import { useLayoutEffect } from 'react'

// dvh handles browser chrome; VisualViewport also handles the software keyboard
// and its pan offset on mobile browsers. Variables are shared with portaled help.
export default function useVisualViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const alreadyActive = root.classList.contains('questionnaire-active')
    root.classList.add('questionnaire-active')
    const viewport = window.visualViewport
    const names = ['height', 'width', 'top', 'left'] as const
    const previous = names.map(name => root.style.getPropertyValue(`--questionnaire-viewport-${name}`))
    const update = () => {
      const values = [viewport?.height ?? window.innerHeight, viewport?.width ?? window.innerWidth, viewport?.offsetTop ?? 0, viewport?.offsetLeft ?? 0]
      names.forEach((name, index) => root.style.setProperty(`--questionnaire-viewport-${name}`, `${values[index]}px`))
    }
    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      if (!alreadyActive) root.classList.remove('questionnaire-active')
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      names.forEach((name, index) => {
        const property = `--questionnaire-viewport-${name}`
        if (previous[index]) root.style.setProperty(property, previous[index])
        else root.style.removeProperty(property)
      })
    }
  }, [])
}
