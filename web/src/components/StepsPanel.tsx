import { useState } from 'react'
import { designSteps, type StepsDesignParams } from '../api/client'
import type { StepsDesignResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'

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
  const [topology, setTopology] = useState<StepsTopology>('T_bridged')
  const [Z0, setZ0] = useState('600')
  const [Z1, setZ1] = useState('100')
  const [Z2, setZ2] = useState('200')
  const [dbStr, setDbStr] = useState('0, 3, 6, 12, 24')
  const [result, setResult] = useState<StepsDesignResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <section className="panel">
      <div className="panel-title">
        <div>
          <span className="tag">MVP 5</span>
          <h2>{tr.stepsTitle}</h2>
        </div>
      </div>
      <div className="panel-body">
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
