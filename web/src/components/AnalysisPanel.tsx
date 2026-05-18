import { useState } from 'react'
import { analyzeAttenuator, type Topology } from '../api/client'
import type { AnalysisResult } from '../api/client'
import type { SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'

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
  const [topology, setTopology] = useState<Topology>('T_symmetric')
  const [vals, setVals] = useState<Record<string, string>>(defaultValues['T_symmetric'])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>{tr.analysisTitle}</h2>
        </div>
      </div>
      <div className="panel-body">
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
          </>
        )}

        {!result && !error && (
          <div className="empty-state">{tr.emptyAnalysis}</div>
        )}
      </div>
    </section>
  )
}
