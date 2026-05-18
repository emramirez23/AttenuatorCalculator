import { useCallback, useRef, useState } from 'react'
import { designLadder, type LadderDesignParams, type LadderDesignResult } from '../api/client'
import type { SolutionStep } from '../types'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { downloadTeX } from '../utils/latex'

type CellType = LadderDesignParams['cellType']

interface LadderPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

function parseDbList(s: string): number[] {
  return s.split(',').map(x => x.trim()).filter(Boolean).map(parseFloat).filter(n => !isNaN(n))
}

function fmt(v: number): string {
  return isFinite(v) ? v.toFixed(2) : '∞'
}

export function LadderPanel({ onSteps }: LadderPanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('ladder')
  const [cellType, setCellType] = useState<CellType>(((initial?.cellType as CellType) ?? 'T_symmetric'))
  const [Z0, setZ0] = useState(initial?.Z0 ?? '600')
  const [dbStr, setDbStr] = useState(initial?.list ?? '6, 6, 6')
  const [result, setResult] = useState<LadderDesignResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { copied, share } = useShareLink('ladder')

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
    if (isNaN(z0n) || z0n <= 0) { setError(tr.errZ0Positive); return }
    const list = parseDbList(dbStr)
    if (list.length === 0) { setError(tr.errStepsList); return }

    setLoading(true)
    try {
      const res = await designLadder({ cellType, Z0: z0n, dB_list: list })
      setResult(res)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.unknownError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleShare() { share({ cellType, Z0, list: dbStr }) }
  function handleExportTeX() {
    if (!result) return
    const lines: string[] = []
    lines.push('\\documentclass[11pt,a4paper]{article}')
    lines.push('\\usepackage[T1]{fontenc}\\usepackage[utf8]{inputenc}\\usepackage[spanish]{babel}')
    lines.push('\\usepackage[margin=2cm]{geometry}\\usepackage{amsmath,amssymb}\\usepackage{circuitikz}\\usepackage{longtable}')
    lines.push(`\\title{Atenuador en escalera --- ${result.cellType === 'T_symmetric' ? 'celdas T' : 'celdas $\\pi$'}}`)
    lines.push('\\author{Simulador de Atenuadores --- UTN FRA}\\date{\\today}')
    lines.push('\\begin{document}\\maketitle')
    lines.push(`\\section*{Datos}`)
    lines.push(`Z$_0$ = ${result.Z0}\\,$\\Omega$\\par`)
    lines.push(`Pasos: ${result.cells.map(c => `${c.dB}\\,dB`).join(', ')}\\par`)
    lines.push('\\section*{Celdas individuales}')
    lines.push('\\begin{tabular}{|c|c|c|c|}\\hline')
    lines.push('Celda & A (dB) & R serie ($\\Omega$) & R shunt ($\\Omega$)\\\\\\hline')
    for (const c of result.cells) {
      lines.push(`${c.index} & ${c.dB} & ${fmt(c.R_series)} & ${fmt(c.R_shunt)} \\\\\\hline`)
    }
    lines.push('\\end{tabular}')
    lines.push('\\section*{Red equivalente fusionada}')
    lines.push('\\begin{tabular}{|c|l|c|}\\hline')
    lines.push('Tipo & Origen & Valor ($\\Omega$)\\\\\\hline')
    for (const e of result.network) {
      lines.push(`${e.kind === 'series' ? 'Serie' : 'Shunt'} & ${e.label.replace(/∥/g, '\\,$\\parallel$\\,')} & ${fmt(e.value)} \\\\\\hline`)
    }
    lines.push('\\end{tabular}')
    lines.push('\\end{document}')
    downloadTeX(`ladder-${result.cellType}.tex`, lines.join('\n'))
  }

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.ladderTitle}</h2>
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
        <p className="panel-lead">{tr.ladderLead}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              {tr.ladderCellLabel}
              <select value={cellType} onChange={e => setCellType(e.target.value as CellType)}>
                <option value="T_symmetric">{tr.topologies.T_symmetric}</option>
                <option value="pi_symmetric">{tr.topologies.pi_symmetric}</option>
              </select>
            </label>
            <label>
              Z₀ (Ω)
              <input type="number" step="any" min="0.001" value={Z0} onChange={e => setZ0(e.target.value)} required />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              {tr.ladderDbListLabel}
              <input type="text" value={dbStr} onChange={e => setDbStr(e.target.value)} required placeholder="6, 6, 6" />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.ladderBtn}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <>
            <h3 className="cells-title">{tr.ladderCells}</h3>
            <div className="cells-grid">
              {result.cells.map(c => (
                <div className="cell-card" key={c.index}>
                  <div className="cell-head">
                    <span className="cell-tag">Celda {c.index} — A = {c.dB} dB</span>
                    <span className="cell-k">K = {c.K.toFixed(4)}</span>
                  </div>
                  <div className="cell-resistors">
                    <div className="cell-chip">
                      <span className="cell-chip-name">{result.cellType === 'T_symmetric' ? 'R1 (serie)' : 'R3 (serie)'}</span>
                      <span className="cell-chip-val">{fmt(c.R_series)}</span>
                      <span className="cell-chip-unit">Ω</span>
                    </div>
                    <div className="cell-chip">
                      <span className="cell-chip-name">{result.cellType === 'T_symmetric' ? 'R3 (shunt)' : 'R1 (shunt)'}</span>
                      <span className="cell-chip-val">{fmt(c.R_shunt)}</span>
                      <span className="cell-chip-unit">Ω</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="cells-title">{tr.ladderMerged}</h3>
            <div className="ladder-network">
              {result.network.map((el, i) => (
                <div className={`ladder-elem ladder-elem--${el.kind}`} key={i}>
                  <span className="ladder-kind">{el.kind === 'series' ? '↔ Serie' : '↕ Shunt'}</span>
                  <span className="ladder-label">{el.label}</span>
                  <span className="ladder-val">{fmt(el.value)} Ω</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.ladderEmpty}</div>
        )}
      </div>
    </section>
  )
}
