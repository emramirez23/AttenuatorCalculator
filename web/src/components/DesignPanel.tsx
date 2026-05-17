import { useState } from 'react'
import { designAttenuator, type Topology, type DesignParams } from '../api/client'
import type { DesignResult, SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'

interface DesignPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

const TOPOLOGY_LABELS: Record<Topology, string> = {
  T_symmetric:  'T simétrico',
  pi_symmetric: 'π simétrico',
  T_asymmetric:  'T asimétrico',
  pi_asymmetric: 'π asimétrico',
  T_bridged:    'T puenteado (bridged)',
  L_minloss:    'Adaptador L (pérdida mínima)',
}

function isSymmetric(t: Topology) {
  return t === 'T_symmetric' || t === 'pi_symmetric' || t === 'T_bridged'
}

function needsAttenuation(t: Topology) {
  return t !== 'L_minloss'
}

export function DesignPanel({ onSteps }: DesignPanelProps) {
  const [topology, setTopology] = useState<Topology>('T_symmetric')
  const [Z0, setZ0] = useState('500')
  const [Z1, setZ1] = useState('600')
  const [Z2, setZ2] = useState('100')
  const [attdB, setAttdB] = useState('15')
  const [result, setResult] = useState<DesignResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleTopologyChange(t: Topology) {
    setTopology(t)
    setResult(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const params: DesignParams = { topology }

    if (isSymmetric(topology)) {
      const z0Num = parseFloat(Z0)
      if (isNaN(z0Num) || z0Num <= 0) { setError('Z₀ debe ser un número positivo.'); return }
      params.Z0 = z0Num
    } else {
      const z1Num = parseFloat(Z1)
      const z2Num = parseFloat(Z2)
      if (isNaN(z1Num) || z1Num <= 0 || isNaN(z2Num) || z2Num <= 0) {
        setError('Z₁ y Z₂ deben ser números positivos.'); return
      }
      params.Z1 = z1Num
      params.Z2 = z2Num
    }

    if (needsAttenuation(topology)) {
      const dbNum = parseFloat(attdB)
      if (isNaN(dbNum) || dbNum < 0) { setError('La atenuación debe ser ≥ 0 dB.'); return }
      params.attenuation_dB = dbNum
    }

    setLoading(true)
    try {
      const res = await designAttenuator(params)
      setResult(res)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const resistorEntries = result ? Object.entries(result.resistors) : []
  const sym = isSymmetric(topology)

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <span className="tag">MVP 3</span>
          <h2>Diseño de atenuador</h2>
        </div>
      </div>
      <div className="panel-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              Topología
              <select value={topology} onChange={e => handleTopologyChange(e.target.value as Topology)}>
                {(Object.keys(TOPOLOGY_LABELS) as Topology[]).map(t => (
                  <option key={t} value={t}>{TOPOLOGY_LABELS[t]}</option>
                ))}
              </select>
            </label>

            {sym ? (
              <label>
                Z₀ (Ω)
                <input
                  type="number" step="any" min="0.001"
                  value={Z0} onChange={e => setZ0(e.target.value)}
                  placeholder="500" required
                />
              </label>
            ) : (
              <>
                <label>
                  Z₁ (Ω) — entrada
                  <input
                    type="number" step="any" min="0.001"
                    value={Z1} onChange={e => setZ1(e.target.value)}
                    placeholder="600" required
                  />
                </label>
                <label>
                  Z₂ (Ω) — salida
                  <input
                    type="number" step="any" min="0.001"
                    value={Z2} onChange={e => setZ2(e.target.value)}
                    placeholder="100" required
                  />
                </label>
              </>
            )}

            {needsAttenuation(topology) && (
              <label>
                A (dB)
                <input
                  type="number" step="any" min="0"
                  value={attdB} onChange={e => setAttdB(e.target.value)}
                  placeholder="15" required
                />
              </label>
            )}

            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />Calculando</> : 'Calcular'}
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

            <div className="resistor-chips">
              {resistorEntries.map(([name, val]) => (
                <div className="resistor-chip" key={name}>
                  <span className="chip-label">{name}</span>
                  <span className="chip-value">
                    {isFinite(val) ? val.toFixed(2) : '∞'}
                  </span>
                  <span className="chip-unit">Ω</span>
                </div>
              ))}
            </div>

            <div className="circuit-container">
              <CircuitSVG
                topology={result.topology}
                resistors={result.resistors}
                Z_in={result.Z_in}
                Z_out={result.Z_out}
              />
            </div>

            <div className="z-params">
              <span className="z-badge">Z_in = {result.Z_in} Ω</span>
              <span className="z-badge">Z_out = {result.Z_out} Ω</span>
              <span className="z-badge">A = {result.attenuation.dB.toFixed(2)} dB</span>
              <span className="z-badge">K = {result.attenuation.K.toFixed(4)}</span>
            </div>
          </>
        )}

        {!result && !error && (
          <div className="empty-state">
            {sym
              ? 'Seleccioná la topología, ingresá Z₀ y la atenuación deseada'
              : topology === 'L_minloss'
                ? 'Ingresá Z₁ (alta) y Z₂ (baja) — la atenuación mínima se calcula automáticamente'
                : 'Ingresá Z₁, Z₂ y la atenuación deseada (debe superar la mínima realizable)'
            }
          </div>
        )}
      </div>
    </section>
  )
}
