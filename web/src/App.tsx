import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'
import { ConversionPanel } from './components/ConversionPanel'
import { DesignPanel } from './components/DesignPanel'
import { AnalysisPanel } from './components/AnalysisPanel'
import { StepsPanel } from './components/StepsPanel'
import { LadderPanel } from './components/LadderPanel'
import { ComparePanel } from './components/ComparePanel'
import { StepsOutput } from './components/StepsOutput'
import { LangContext } from './LangContext'
import { translations } from './i18n'
import type { Lang } from './i18n'
import type { SolutionStep } from './types'

type Theme = 'light' | 'dark'
type StepsType = 'conversion' | 'design' | 'analysis' | 'steps' | 'ladder' | 'compare'

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'light'
}

function getInitialLang(): Lang {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'es' || stored === 'en') return stored
  }
  return 'es'
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [lang, setLang] = useState<Lang>(getInitialLang)
  const [steps, setSteps] = useState<SolutionStep[]>([])
  const [stepsType, setStepsType] = useState<StepsType>('design')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  function toggleLang() {
    setLang(l => (l === 'es' ? 'en' : 'es'))
  }

  const tr = translations[lang]

  return (
    <LangContext.Provider value={{ lang, tr, toggleLang }}>
      <Hero theme={theme} onToggleTheme={toggleTheme} />
      <main className="workspace">
        <ConversionPanel onSteps={s => { setSteps(s); setStepsType('conversion') }} />
        <DesignPanel    onSteps={s => { setSteps(s); setStepsType('design') }} />
        <AnalysisPanel  onSteps={s => { setSteps(s); setStepsType('analysis') }} />
        <StepsPanel     onSteps={s => { setSteps(s); setStepsType('steps') }} />
        <LadderPanel    onSteps={s => { setSteps(s); setStepsType('ladder') }} />
        <ComparePanel   onSteps={s => { setSteps(s); setStepsType('compare') }} />
        <StepsOutput steps={steps} stepsType={stepsType} />
      </main>
    </LangContext.Provider>
  )
}
