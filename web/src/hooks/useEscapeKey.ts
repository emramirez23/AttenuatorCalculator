import { useEffect } from 'react'

/**
 * Calls `onEscape` when the user presses Esc *inside the given container*
 * (or anywhere on the page when `containerRef` is null).
 * Ignores Esc events that target elements outside the container.
 */
export function useEscapeKey(onEscape: () => void, containerRef?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (containerRef && containerRef.current) {
        const target = e.target as Node
        if (!containerRef.current.contains(target)) return
      }
      onEscape()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onEscape, containerRef])
}
