/**
 * Marks <html data-keyboard> while an on-screen keyboard takes up the screen, so the bottom
 * navigation can step aside. A focused input alone is not enough: there is no on-screen keyboard
 * on desktop or with a hardware keyboard, and on Android the keyboard can be dismissed while the
 * field keeps focus.
 */
export function setupKeyboardDetection() {
  const viewport = window.visualViewport
  if (!viewport) return
  let fullHeight = Math.max(window.innerHeight, viewport.height)
  const update = () => {
    fullHeight = Math.max(fullHeight, window.innerHeight, viewport.height)
    // Android (interactive-widget=resizes-content) shrinks both heights; iOS only the visual one.
    const keyboard = viewport.height < fullHeight * 0.75
    document.documentElement.toggleAttribute('data-keyboard', keyboard)
  }
  viewport.addEventListener('resize', update)
  // A rotation changes what "full height" means.
  window.addEventListener('orientationchange', () => {
    fullHeight = 0
    window.setTimeout(update, 300)
  })
}
