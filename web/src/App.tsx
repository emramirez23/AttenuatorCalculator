import { useEffect, useState } from 'react'
import { Hero } from './components/Hero'
import { ConversionPanel } from './components/ConversionPanel'
import { DesignPanel } from './components/DesignPanel'
import { StepsOutput } from './components/StepsOutput'
import type { SolutionStep } from './types'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'light'
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [steps, setSteps] = useState<SolutionStep[]>([])
  const [stepsTitle, setStepsTitle] = useState('Resolución paso a paso')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  function handleConversionSteps(s: SolutionStep[]) {
    setSteps(s)
    setStepsTitle('Conversión de unidades — Resolución')
  }

  function handleDesignSteps(s: SolutionStep[]) {
    setSteps(s)
    setStepsTitle('Diseño de atenuador — Resolución')
  }

  return (
    <>
      <Hero theme={theme} onToggleTheme={toggleTheme} />
      <main className="workspace">
        <ConversionPanel onSteps={handleConversionSteps} />
        <DesignPanel onSteps={handleDesignSteps} />
        <StepsOutput steps={steps} title={stepsTitle} />
      </main>
    </>
  )
}
