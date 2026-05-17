import { useState } from 'react'
import { convertAttenuation, type Unit } from '../api/client'
import type { AttenuationValues, SolutionStep } from '../types'

interface ConversionPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

const UNIT_LABELS: Record<Unit, string> = {
  dB: 'dB',
  K: 'K — razón de tensión',
  neper: 'Neper (α)',
}

export function ConversionPanel({ onSteps }: ConversionPanelProps) {
  const [value, setValue] = useState('15')
  const [unit, setUnit] = useState<Unit>('dB')
  const [result, setResult] = useState<AttenuationValues | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = parseFloat(value)
    if (isNaN(num)) {
      setError('Ingresá un número válido.')
      return
    }
    setLoading(true)
    try {
      const res = await convertAttenuation(num, unit)
      setResult(res.attenuation)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <span className="tag">MVP 1</span>
          <h2>Unidades de atenuación</h2>
        </div>
      </div>
      <div className="panel-body">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Valor
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
              Unidad
              <select value={unit} onChange={e => setUnit(e.target.value as Unit)}>
                {(Object.keys(UNIT_LABELS) as Unit[]).map(u => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />Calculando</> : 'Convertir'}
            </button>
          </div>
        </form>

        {error && <div className="error-box">{error}</div>}

        {result && !error && (
          <div className="att-values-grid">
            <div className="att-value-card">
              <span className="val-label">K</span>
              <span className="val-number">{result.K.toFixed(4)}</span>
              <span className="val-unit">razón de tensión</span>
            </div>
            <div className="att-value-card">
              <span className="val-label">N</span>
              <span className="val-number">{result.N.toFixed(4)}</span>
              <span className="val-unit">razón de potencia</span>
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
          <div className="empty-state">Ingresá un valor y presioná Convertir</div>
        )}
      </div>
    </section>
  )
}
