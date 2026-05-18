import { useCallback, useRef, useState } from 'react'
import { analyzeAttenuator, type Topology } from '../api/client'
import type { AnalysisResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { usePDFExport } from '../hooks/usePDFExport'
import { buildAnalysisTeX, downloadTeX } from '../utils/latex'

interface AnalysisPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

function isSymmetric(t: Topology) {
  return t === 'T_symmetric' || t === 'pi_symmetric' || t === 'T_bridged'
}

function fieldNames(t: Topology): string[] {
  if (t === 'T_symmetric' || t === 'pi_symmetric') return ['R1', 'R3']
  if (t === 'T_asymmetric' || t === 'pi_asymmetric') return ['R1', 'R3', 'R2']
  if (t === 'L_minloss') return ['Rs', 'Rp']
  return ['R1', 'R2', 'R3', 'R4']
}

const defaultValues: Record<string, Record<string, string>> = {
  T_symmetric:    { R1: '349.02', R3: '183.63' },
  pi_symmetric:   { R1: '716.29', R3: '1361.40' },
  T_asymmetric:   { R1: '562.64', R3: '49.48',  R2: '52.54' },
  pi_asymmetric:  { R1: '1142.08', R3: '1212.50', R2: '106.64' },
  T_bridged:      { R1: '500', R2: '500', R3: '108.15', R4: '2311.71' },
  L_minloss:      { Rs: '547.72', Rp: '109.54' },
}

export function AnalysisPanel({ onSteps }: AnalysisPanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('analyze')
  const initTopology = ((initial?.topology as Topology) ?? 'T_symmetric')
  const initVals: Record<string, string> = { ...defaultValues[initTopology] }
  if (initial) {
    for (const name of fieldNames(initTopology)) {
      if (initial[name]) initVals[name] = initial[name]
    }
  }
  const [topology, setTopology] = useState<Topology>(initTopology)
  const [vals, setVals] = useState<Record<string, string>>(initVals)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [balanced, setBalanced] = useState(false)
  const { copied, share } = useShareLink('analyze')
  const pdf = usePDFExport()

  const clearResults = useCallback(() => {
    setResult(null)
    setError(null)
    setBalanced(false)
    onSteps([])
  }, [onSteps])

  useEscapeKey(clearResults, sectionRef)

  function handleShare() {
    share({ topology, ...vals })
  }
  function handleExportTeX() {
    if (!result) return
    downloadTeX(`analisis-${result.topology}.tex`, buildAnalysisTeX(result, balanced))
  }
  function handleExportPDF() {
    if (!result) return
    pdf.exportPDF(buildAnalysisTeX(result, balanced), `analisis-${result.topology}.pdf`)
  }

  function handleTopologyChange(t: Topology) {
    setTopology(t)
    setVals(defaultValues[t])
    setResult(null)
    setError(null)
  }

  function setVal(name: string, v: string) {
    setVals(prev => ({ ...prev, [name]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const resistors: Record<string, number> = {}
    for (const name of fieldNames(topology)) {
      const n = parseFloat(vals[name] ?? '')
      if (isNaN(n) || n <= 0) {
        setError(tr.errResPositive)
        return
      }
      resistors[name] = n
    }

    setLoading(true)
    try {
      const res = await analyzeAttenuator({ topology, resistors })
      setResult(res)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.unknownError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const sym = isSymmetric(topology)
  const isL = topology === 'L_minloss'

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.analysisTitle}</h2>
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
        <p className="panel-lead">{tr.analysisLead}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              {tr.topologyLabel}
              <select value={topology} onChange={e => handleTopologyChange(e.target.value as Topology)}>
                {(Object.keys(tr.topologies) as Topology[]).map(t => (
                  <option key={t} value={t}>{tr.topologies[t]}</option>
                ))}
              </select>
            </label>

            {fieldNames(topology).map(name => (
              <label key={name}>
                {name} (Ω)
                <input
                  type="number" step="any" min="0.001"
                  value={vals[name] ?? ''}
                  onChange={e => setVal(name, e.target.value)}
                  required
                />
              </label>
            ))}

            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.analyzeBtn}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <>
            <div className="att-values-grid">
              {sym ? (
                <div className="att-value-card">
                  <span className="val-label">Z₀</span>
                  <span className="val-number">{result.Z_in.toFixed(2)}</span>
                  <span className="val-unit">Ω</span>
                </div>
              ) : (
                <>
                  <div className="att-value-card">
                    <span className="val-label">Z₁</span>
                    <span className="val-number">{result.Z_in.toFixed(2)}</span>
                    <span className="val-unit">Ω {isL ? '(alta)' : ''}</span>
                  </div>
                  <div className="att-value-card">
                    <span className="val-label">Z₂</span>
                    <span className="val-number">{result.Z_out.toFixed(2)}</span>
                    <span className="val-unit">Ω {isL ? '(baja)' : ''}</span>
                  </div>
                </>
              )}
              <div className="att-value-card">
                <span className="val-label">A</span>
                <span className="val-number">{result.attenuation.dB.toFixed(2)}</span>
                <span className="val-unit">dB</span>
              </div>
              <div className="att-value-card">
                <span className="val-label">K</span>
                <span className="val-number">{result.attenuation.K.toFixed(4)}</span>
                <span className="val-unit">razón</span>
              </div>
            </div>

            <div className="circuit-container">
              <CircuitSVG
                topology={result.topology}
                resistors={result.resistors}
                Z_in={Math.round(result.Z_in)}
                Z_out={Math.round(result.Z_out)}
              />
            </div>

            {result.topology !== 'T_bridged' && (
              <div className="balanced-toggle" role="group" aria-label="Versión del circuito">
                <button type="button" className={balanced ? '' : 'is-on'} onClick={() => setBalanced(false)}>{tr.unbalancedToggle}</button>
                <button type="button" className={balanced ? 'is-on' : ''} onClick={() => setBalanced(true)}>{tr.balancedToggle}</button>
              </div>
            )}
            {balanced && result.topology !== 'T_bridged' && (
              <p className="balanced-note">{tr.balancedNote}</p>
            )}
          </>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.emptyAnalysis}</div>
        )}
      </div>
    </section>
  )
}
