import { useCallback, useEffect, useState } from 'react'

export type PanelName = 'convert' | 'design' | 'analyze' | 'steps' | 'ladder' | 'compare'

/**
 * Reads the URL query string ONCE on mount and returns the params for the
 * given panel, only if the URL targets that panel (?panel=<name>).
 * Returns null if the URL targets a different panel.
 */
export function readInitialParams(panel: PanelName): Record<string, string> | null {
  if (typeof window === 'undefined') return null
  const sp = new URLSearchParams(window.location.search)
  if (sp.get('panel') !== panel) return null
  const out: Record<string, string> = {}
  sp.forEach((v, k) => { if (k !== 'panel') out[k] = v })
  return out
}

/**
 * Builds an absolute URL pointing at this panel with the given params.
 */
export function buildPermalink(panel: PanelName, params: Record<string, string | number | undefined>): string {
  const base = window.location.origin + window.location.pathname
  const sp = new URLSearchParams()
  sp.set('panel', panel)
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  return `${base}?${sp.toString()}`
}

/**
 * Hook that returns { copied, share(params) } for the given panel.
 * `copied` is true for ~1.6 s right after a successful copy.
 */
export function useShareLink(panel: PanelName) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  const share = useCallback(async (params: Record<string, string | number | undefined>) => {
    const url = buildPermalink(panel, params)
    try {
      await navigator.clipboard.writeText(url)
      window.history.replaceState({}, '', url)
      setCopied(true)
    } catch {
      window.prompt('Copiá el enlace:', url)
    }
  }, [panel])

  return { copied, share }
}
