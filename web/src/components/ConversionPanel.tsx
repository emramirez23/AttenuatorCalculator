import { useCallback, useRef, useState } from 'react'
import { convertAttenuation, type Unit } from '../api/client'
import type { AttenuationValues, SolutionStep } from '../types'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { usePDFExport } from '../hooks/usePDFExport'
import { buildConversionTeX, downloadTeX } from '../utils/latex'

interface ConversionPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

export function ConversionPanel({ onSteps }: ConversionPanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('convert')
  const [value, setValue] = useState(initial?.value ?? '15')
  const [unit, setUnit] = useState<Unit>(((initial?.unit as Unit) ?? 'dB'))
  const [result, setResult] = useState<AttenuationValues | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { copied, share } = useShareLink('convert')
  const pdf = usePDFExport()

  const clearResults = useCallback(() => {
    setResult(null)
    setError(null)
    onSteps([])
  }, [onSteps])

  useEscapeKey(clearResults, sectionRef)

  function handleShare() { share({ value, unit }) }
  function handleExportTeX() {
    if (!result) return
    const tex = buildConversionTeX(parseFloat(value), unit, result)
    downloadTeX(`conversion-${unit}-${value}.tex`, tex)
  }
  function handleExportPDF() {
    if (!result) return
    const tex = buildConversionTeX(parseFloat(value), unit, result)
    pdf.exportPDF(tex, `conversion-${unit}-${value}.pdf`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = parseFloat(value)
    if (isNaN(num)) {
      setError(tr.invalidNumber)
      return
    }
    setLoading(true)
    try {
      const res = await convertAttenuation(num, unit)
      setResult(res.attenuation)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.unknownError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.conversionTitle}</h2>
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
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              {tr.valueLabel}
              <input
                type="number"
                step="any"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="15"
                required
              />
            </label>
            <label>
              {tr.unitLabel}
              <select value={unit} onChange={e => setUnit(e.target.value as Unit)}>
                {(Object.keys(tr.units) as Unit[]).map(u => (
                  <option key={u} value={u}>{tr.units[u]}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.convertBtn}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <div className="att-values-grid">
            <div className="att-value-card">
              <span className="val-label">K</span>
              <span className="val-number">{result.K.toFixed(4)}</span>
              <span className="val-unit">{tr.voltageRatio}</span>
            </div>
            <div className="att-value-card">
              <span className="val-label">N</span>
              <span className="val-number">{result.N.toFixed(4)}</span>
              <span className="val-unit">{tr.powerRatio}</span>
            </div>
            <div className="att-value-card">
              <span className="val-label">A</span>
              <span className="val-number">{result.dB.toFixed(4)}</span>
              <span className="val-unit">dB</span>
            </div>
            <div className="att-value-card">
              <span className="val-label">α</span>
              <span className="val-number">{result.alpha.toFixed(4)}</span>
              <span className="val-unit">Nepers</span>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.emptyConversion}</div>
        )}
      </div>
    </section>
  )
}
