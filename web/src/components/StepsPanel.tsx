import { useCallback, useRef, useState } from 'react'
import { designSteps, type StepsDesignParams } from '../api/client'
import type { StepsDesignResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { usePDFExport } from '../hooks/usePDFExport'
import { buildStepsTeX, downloadTeX } from '../utils/latex'

type StepsTopology = StepsDesignParams['topology']

interface StepsPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

function isSymmetric(t: StepsTopology) {
  return t === 'T_symmetric' || t === 'pi_symmetric' || t === 'T_bridged'
}

function parseDbList(s: string): number[] {
  return s.split(',').map(x => x.trim()).filter(Boolean).map(parseFloat).filter(n => !isNaN(n))
}

export function StepsPanel({ onSteps }: StepsPanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('steps')
  const [topology, setTopology] = useState<StepsTopology>(((initial?.topology as StepsTopology) ?? 'T_bridged'))
  const [Z0, setZ0] = useState(initial?.Z0 ?? '600')
  const [Z1, setZ1] = useState(initial?.Z1 ?? '100')
  const [Z2, setZ2] = useState(initial?.Z2 ?? '200')
  const [dbStr, setDbStr] = useState(initial?.list ?? '0, 3, 6, 12, 24')
  const [result, setResult] = useState<StepsDesignResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { copied, share } = useShareLink('steps')
  const pdf = usePDFExport()

  const clearResults = useCallback(() => {
    setResult(null)
    setError(null)
    onSteps([])
  }, [onSteps])

  useEscapeKey(clearResults, sectionRef)

  function handleShare() {
    const sym = isSymmetric(topology)
    share({ topology, Z0: sym ? Z0 : undefined, Z1: !sym ? Z1 : undefined, Z2: !sym ? Z2 : undefined, list: dbStr })
  }
  function handleExportTeX() {
    if (!result) return
    downloadTeX(`pasos-${result.topology}.tex`, buildStepsTeX(result))
  }
  function handleExportPDF() {
    if (!result) return
    pdf.exportPDF(buildStepsTeX(result), `pasos-${result.topology}.pdf`)
  }

  function handleTopologyChange(t: StepsTopology) {
    setTopology(t)
    setResult(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const dbList = parseDbList(dbStr)
    if (dbList.length === 0) { setError(tr.errStepsList); return }

    const params: StepsDesignParams = { topology, dB_list: dbList }
    if (isSymmetric(topology)) {
      const z0 = parseFloat(Z0)
      if (isNaN(z0) || z0 <= 0) { setError(tr.errZ0Positive); return }
      params.Z0 = z0
    } else {
      const z1 = parseFloat(Z1)
      const z2 = parseFloat(Z2)
      if (isNaN(z1) || z1 <= 0 || isNaN(z2) || z2 <= 0) { setError(tr.errZ1Z2Positive); return }
      params.Z1 = z1
      params.Z2 = z2
    }

    setLoading(true)
    try {
      const res = await designSteps(params)
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
  const stepsTopologies: StepsTopology[] = ['T_symmetric', 'pi_symmetric', 'T_asymmetric', 'pi_asymmetric', 'T_bridged']

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.stepsTitle}</h2>
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
        <p className="panel-lead">{tr.stepsLead}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              {tr.topologyLabel}
              <select value={topology} onChange={e => handleTopologyChange(e.target.value as StepsTopology)}>
                {stepsTopologies.map(t => (
                  <option key={t} value={t}>{tr.topologies[t]}</option>
                ))}
              </select>
            </label>

            {sym ? (
              <label>
                Z₀ (Ω)
                <input
                  type="number" step="any" min="0.001"
                  value={Z0} onChange={e => setZ0(e.target.value)}
                  placeholder="600" required
                />
              </label>
            ) : (
              <>
                <label>
                  {tr.z1InputLabel}
                  <input type="number" step="any" min="0.001" value={Z1} onChange={e => setZ1(e.target.value)} required />
                </label>
                <label>
                  {tr.z2OutputLabel}
                  <input type="number" step="any" min="0.001" value={Z2} onChange={e => setZ2(e.target.value)} required />
                </label>
              </>
            )}

            <label style={{ gridColumn: '1 / -1' }}>
              {tr.stepsDbListLabel}
              <input
                type="text"
                value={dbStr}
                onChange={e => setDbStr(e.target.value)}
                placeholder={tr.stepsDbListPh}
                required
              />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.stepsBtn}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <>
            {result.warnings.length > 0 && (
              <div className="warn-box">
                {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}
            <h3 className="cells-title">{tr.stepsResultsTitle}</h3>
            <div className="cells-grid">
              {result.cells.map((cell, i) => (
                <div className="cell-card" key={i}>
                  <div className="cell-head">
                    <span className="cell-tag">A = {cell.dB} dB</span>
                    <span className="cell-k">K = {cell.K.toFixed(4)}</span>
                  </div>
                  <div className="cell-resistors">
                    {Object.entries(cell.resistors).map(([name, val]) => (
                      <div className="cell-chip" key={name}>
                        <span className="cell-chip-name">{name}</span>
                        <span className="cell-chip-val">{isFinite(val) ? val.toFixed(2) : '∞'}</span>
                        <span className="cell-chip-unit">Ω</span>
                      </div>
                    ))}
                  </div>
                  <div className="cell-circuit">
                    <CircuitSVG
                      topology={cell.topology}
                      resistors={cell.resistors}
                      Z_in={Math.round(cell.Z_in)}
                      Z_out={Math.round(cell.Z_out)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.emptySteps}</div>
        )}
      </div>
    </section>
  )
}
