import { useCallback, useRef, useState } from 'react'
import { compareTopologies, type CompareResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { downloadTeX } from '../utils/latex'

interface ComparePanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

export function ComparePanel({ onSteps }: ComparePanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('compare')
  const [Z0, setZ0] = useState(initial?.Z0 ?? '500')
  const [dB, setDB] = useState(initial?.dB ?? '15')
  const [Pin, setPin] = useState(initial?.Pin ?? '1')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { copied, share } = useShareLink('compare')

  const clearResults = useCallback(() => {
    setResult(null)
    setError(null)
    onSteps([])
  }, [onSteps])

  useEscapeKey(clearResults, sectionRef)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const z0n = parseFloat(Z0)
    const dBn = parseFloat(dB)
    const Pn = parseFloat(Pin)
    if (isNaN(z0n) || z0n <= 0) { setError(tr.errZ0Positive); return }
    if (isNaN(dBn) || dBn < 0)   { setError(tr.errAttPositive); return }
    if (isNaN(Pn)  || Pn <= 0)   { setError(tr.invalidNumber); return }

    setLoading(true)
    try {
      const res = await compareTopologies({ Z0: z0n, attenuation_dB: dBn, P_in: Pn })
      setResult(res)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.unknownError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleShare() { share({ Z0, dB, Pin }) }
  function handleExportTeX() {
    if (!result) return
    const lines: string[] = []
    lines.push('\\documentclass[11pt,a4paper]{article}')
    lines.push('\\usepackage[T1]{fontenc}\\usepackage[utf8]{inputenc}\\usepackage[spanish]{babel}')
    lines.push('\\usepackage[margin=2cm]{geometry}\\usepackage{amsmath,amssymb}\\usepackage{circuitikz}\\usepackage{longtable}')
    lines.push('\\title{Comparador de topologías}\\author{Simulador de Atenuadores --- UTN FRA}\\date{\\today}')
    lines.push('\\begin{document}\\maketitle')
    lines.push(`Z$_0$ = ${result.Z0}\\,$\\Omega$, A = ${result.attenuation_dB}\\,dB, K = ${result.K.toFixed(4)}, P$_{in}$ = ${result.P_in}\\,W\\par`)
    lines.push('\\begin{tabular}{|l|l|c|c|}\\hline')
    lines.push('Topología & Resistores & Max R ($\\Omega$) & P disipada (W)\\\\\\hline')
    for (const r of result.results) {
      const rs = Object.entries(r.resistors).map(([k, v]) => `${k}=${isFinite(v) ? v.toFixed(2) : '$\\infty$'}\\,$\\Omega$`).join(', ')
      lines.push(`${r.topology.replace('_', '\\_')} & ${rs} & ${r.maxR.toFixed(2)} & ${r.P_dissipated.toFixed(4)}\\\\\\hline`)
    }
    lines.push('\\end{tabular}')
    lines.push('\\end{document}')
    downloadTeX('comparador.tex', lines.join('\n'))
  }

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.compareTitle}</h2>
        </div>
        <div className="panel-actions">
          <button type="button" className="ghost compact" onClick={handleShare}>
            {copied ? tr.copied : tr.shareBtn}
          </button>
          <button type="button" className="ghost compact" onClick={handleExportTeX} disabled={!result}>
            {tr.exportTexBtn}
          </button>
        </div>
      </div>
      <div className="panel-body">
        <p className="panel-lead">{tr.compareLead}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Z₀ (Ω)
              <input type="number" step="any" min="0.001" value={Z0} onChange={e => setZ0(e.target.value)} required />
            </label>
            <label>
              A (dB)
              <input type="number" step="any" min="0" value={dB} onChange={e => setDB(e.target.value)} required />
            </label>
            <label>
              {tr.comparePinLabel}
              <input type="number" step="any" min="0.001" value={Pin} onChange={e => setPin(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.compareBtn}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <div className="compare-grid">
            {result.results.map(r => (
              <div className="compare-card" key={r.topology}>
                <h4>{tr.topologies[r.topology]}</h4>
                <div className="cell-resistors">
                  {Object.entries(r.resistors).map(([k, v]) => (
                    <div className="cell-chip" key={k}>
                      <span className="cell-chip-name">{k}</span>
                      <span className="cell-chip-val">{isFinite(v) ? v.toFixed(2) : '∞'}</span>
                      <span className="cell-chip-unit">Ω</span>
                    </div>
                  ))}
                </div>
                <div className="cell-circuit">
                  <CircuitSVG topology={r.topology} resistors={r.resistors} Z_in={result.Z0} Z_out={result.Z0} />
                </div>
                <div className="compare-metrics">
                  <span className="compare-metric">{tr.compareMaxR} = {r.maxR.toFixed(2)} Ω</span>
                  <span className="compare-metric">{tr.comparePtotal} = {r.P_dissipated.toFixed(4)} W</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.compareEmpty}</div>
        )}
      </div>
    </section>
  )
}
