import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router'
import { lastPopWasBrowserAnimated } from '../lib/navigation'
import { pageMotion, playPageMotion } from '../lib/pageMotion'
import {
  enterEntry,
  historyIndex,
  restoreScroll,
  savedScroll,
  trackScroll,
} from '../lib/scrollMemory'

/**
 * Scroll restoration and the page entrance for every navigation. Renders nothing. A layout
 * effect, so the scroll position and the animation's first frame are in place before the new
 * page is painted.
 */
export function NavigationEffects() {
  const { key, pathname } = useLocation()
  const type = useNavigationType()
  const previous = useRef<{ pathname: string; index: number } | null>(null)

  useEffect(trackScroll, [])

  useLayoutEffect(() => {
    const from = previous.current
    const index = historyIndex(key, type, from?.index ?? 0)
    const samePage = from?.pathname === pathname
    // ?bulan=, filters and search replace the entry: keep the place on the page.
    const keepPlace = samePage && type === NavigationType.Replace
    const target = savedScroll(key)
    enterEntry(key, index, keepPlace ? window.scrollY : target)

    let stop: (() => void) | undefined
    if (type === NavigationType.Pop) {
      // Back/forward, or a reload of this entry. A fresh launch ('default') stays at the top.
      if (from || key !== 'default') stop = restoreScroll(target)
    } else if (!keepPlace) {
      window.scrollTo(0, 0) // a new page starts at the top
    }

    if (from && !samePage) {
      playPageMotion(
        pageMotion(from.pathname, pathname, {
          type,
          fromIndex: from.index,
          toIndex: index,
          browserAnimated: type === NavigationType.Pop && lastPopWasBrowserAnimated(),
        }),
      )
    }
    previous.current = { pathname, index }
    return stop
  }, [key, pathname, type])

  return null
}
