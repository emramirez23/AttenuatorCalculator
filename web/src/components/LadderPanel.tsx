import { useCallback, useRef, useState } from 'react'
import { designLadder, type LadderDesignParams, type LadderDesignResult } from '../api/client'
import type { SolutionStep } from '../types'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { usePDFExport } from '../hooks/usePDFExport'
import { buildLadderTeX, downloadTeX } from '../utils/latex'

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
  const pdf = usePDFExport()

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
    downloadTeX(`ladder-${result.cellType}.tex`, buildLadderTeX(result))
  }
  function handleExportPDF() {
    if (!result) return
    pdf.exportPDF(buildLadderTeX(result), `ladder-${result.cellType}.pdf`)
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
          <button type="button" className="ghost compact" onClick={handleExportPDF} disabled={!result || pdf.loading}>
            {pdf.loading ? <><span className="spinner" />{tr.exportingPdf}</> : tr.exportPdfBtn}
          </button>
        </div>
      </div>
      <div className="panel-body">
        {pdf.error && (
          <div className="error-box" onClick={pdf.dismissError} style={{ cursor: 'pointer' }}>
            <strong>{tr.pdfError}:</strong> {pdf.error}
          </div>
        )}
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
