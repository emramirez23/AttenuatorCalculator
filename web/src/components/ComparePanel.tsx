import { useCallback, useRef, useState } from 'react'
import { compareTopologies, type CompareResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { usePDFExport } from '../hooks/usePDFExport'
import { buildCompareTeX, downloadTeX } from '../utils/latex'

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
    downloadTeX('comparador.tex', buildCompareTeX(result))
  }
  function handleExportPDF() {
    if (!result) return
    pdf.exportPDF(buildCompareTeX(result), 'comparador.pdf')
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
