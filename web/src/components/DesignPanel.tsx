import { useCallback, useRef, useState } from 'react'
import { designAttenuator, type Topology, type DesignParams } from '../api/client'
import type { DesignResult, SolutionStep } from '../types'
import { CircuitSVG } from './CircuitSVG'
import { useLang } from '../LangContext'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { readInitialParams, useShareLink } from '../hooks/usePermalink'
import { buildDesignTeX, downloadTeX } from '../utils/latex'

interface DesignPanelProps {
  onSteps: (steps: SolutionStep[]) => void
}

function isSymmetric(t: Topology) {
  return t === 'T_symmetric' || t === 'pi_symmetric' || t === 'T_bridged'
}

function needsAttenuation(t: Topology) {
  return t !== 'L_minloss'
}

function computeAmin(z1str: string, z2str: string): number | null {
  const z1 = parseFloat(z1str)
  const z2 = parseFloat(z2str)
  if (!isFinite(z1) || !isFinite(z2) || z1 <= 0 || z2 <= 0 || Math.abs(z1 - z2) < 1e-9) return null
  const n = Math.max(z1, z2) / Math.min(z1, z2)
  const kmin = Math.sqrt(n) + Math.sqrt(n - 1)
  return 20 * Math.log10(kmin)
}

export function DesignPanel({ onSteps }: DesignPanelProps) {
  const { tr } = useLang()
  const sectionRef = useRef<HTMLElement | null>(null)
  const initial = readInitialParams('design')
  const [topology, setTopology] = useState<Topology>(((initial?.topology as Topology) ?? 'T_symmetric'))
  const [Z0, setZ0] = useState(initial?.Z0 ?? '500')
  const [Z1, setZ1] = useState(initial?.Z1 ?? '600')
  const [Z2, setZ2] = useState(initial?.Z2 ?? '100')
  const [attdB, setAttdB] = useState(initial?.dB ?? '15')
  const [result, setResult] = useState<DesignResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [balanced, setBalanced] = useState(false)
  const { copied, share } = useShareLink('design')

  const clearResults = useCallback(() => {
    setResult(null)
    setError(null)
    setBalanced(false)
    onSteps([])
  }, [onSteps])

  useEscapeKey(clearResults, sectionRef)

  function handleShare() {
    const sym = isSymmetric(topology)
    share({ topology, Z0: sym ? Z0 : undefined, Z1: !sym ? Z1 : undefined, Z2: !sym ? Z2 : undefined, dB: needsAttenuation(topology) ? attdB : undefined })
  }
  function handleExportTeX() {
    if (!result) return
    downloadTeX(`diseno-${result.topology}-A${result.attenuation.dB.toFixed(0)}dB.tex`, buildDesignTeX(result, balanced))
  }

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
      if (isNaN(z0Num) || z0Num <= 0) { setError(tr.errZ0Positive); return }
      params.Z0 = z0Num
    } else {
      const z1Num = parseFloat(Z1)
      const z2Num = parseFloat(Z2)
      if (isNaN(z1Num) || z1Num <= 0 || isNaN(z2Num) || z2Num <= 0) {
        setError(tr.errZ1Z2Positive); return
      }
      params.Z1 = z1Num
      params.Z2 = z2Num
    }

    if (needsAttenuation(topology)) {
      const dbNum = parseFloat(attdB)
      if (isNaN(dbNum) || dbNum < 0) { setError(tr.errAttPositive); return }
      params.attenuation_dB = dbNum
    }

    setLoading(true)
    try {
      const res = await designAttenuator(params)
      setResult(res)
      onSteps(res.steps)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.unknownError)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const resistorEntries = result ? Object.entries(result.resistors) : []
  const sym = isSymmetric(topology)

  return (
    <section className="panel" ref={sectionRef}>
      <div className="panel-title">
        <div>
          <h2>{tr.designTitle}</h2>
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
                  {tr.z1InputLabel}
                  <input
                    type="number" step="any" min="0.001"
                    value={Z1} onChange={e => setZ1(e.target.value)}
                    placeholder="600" required
                  />
                </label>
                <label>
                  {tr.z2OutputLabel}
                  <input
                    type="number" step="any" min="0.001"
                    value={Z2} onChange={e => setZ2(e.target.value)}
                    placeholder="100" required
                  />
                </label>
              </>
            )}

            {!sym && (() => {
              const amin = computeAmin(Z1, Z2)
              if (amin === null) return null
              const isLminloss = topology === 'L_minloss'
              return (
                <div className="amin-info" style={{ gridColumn: '1 / -1' }}>
                  <span className="amin-value">A_mín = {amin.toFixed(2)} dB</span>
                  <span className="amin-caption">
                    {isLminloss ? tr.aminFixed : tr.aminHelp}
                  </span>
                </div>
              )
            })()}

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
              {loading ? <><span className="spinner" />{tr.calculating}</> : tr.calcBtn}
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

            {result.topology !== 'T_bridged' && (
              <div className="balanced-toggle" role="group" aria-label="Versión del circuito">
                <button type="button" className={balanced ? '' : 'is-on'} onClick={() => setBalanced(false)}>{tr.unbalancedToggle}</button>
                <button type="button" className={balanced ? 'is-on' : ''} onClick={() => setBalanced(true)}>{tr.balancedToggle}</button>
              </div>
            )}
            {balanced && result.topology !== 'T_bridged' && (
              <p className="balanced-note">{tr.balancedNote}</p>
            )}

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
              ? tr.emptySymmetric
              : topology === 'L_minloss'
                ? tr.emptyLminloss
                : tr.emptyAsymmetric
            }
          </div>
        )}
      </div>
    </section>
  )
}
