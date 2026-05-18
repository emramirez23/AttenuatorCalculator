import { createContext, useContext } from 'react'
import type { Lang } from './i18n'
import { translations } from './i18n'

interface LangContextValue {
  lang: Lang
  tr: typeof translations['es']
  toggleLang: () => void
}

export const LangContext = createContext<LangContextValue>({
  lang: 'es',
  tr: translations.es,
  toggleLang: () => {},
})

export function useLang() {
  return useContext(LangContext)
}
