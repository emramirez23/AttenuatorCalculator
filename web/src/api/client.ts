import type { ConvertResponse, DesignResult, SolutionStep, AttenuationValues } from '../types'

export type Unit = 'dB' | 'K' | 'neper'
export type Topology = 'T_symmetric' | 'pi_symmetric' | 'T_asymmetric' | 'pi_asymmetric' | 'T_bridged' | 'L_minloss'

function _k_min(Z1: number, Z2: number): number {
  const n = Math.max(Z1, Z2) / Math.min(Z1, Z2)
  return Math.sqrt(n) + Math.sqrt(n - 1)
}

export async function convertAttenuation(value: number, unit: Unit): Promise<ConvertResponse> {
  if (value < 0) {
    throw new Error(`La atenuación no puede ser negativa. Se recibió ${value} ${unit}.`)
  }

  let K = 1
  let N = 1
  let dB = 0
  let alpha = 0

  if (unit === 'dB') {
    dB = value
    K = Math.pow(10, dB / 20)
    N = Math.pow(10, dB / 10)
    alpha = K > 1 ? Math.log(K) : 0.0
  } else if (unit === 'K') {
    if (value < 1) {
      throw new Error(`K debe ser >= 1 (representa atenuación, no ganancia). Se recibió K = ${value}.`)
    }
    K = value
    dB = 20 * Math.log10(K)
    N = K * K
    alpha = K > 1 ? Math.log(K) : 0.0
  } else if (unit === 'neper') {
    alpha = value
    K = Math.exp(alpha)
    dB = 8.686 * alpha
    N = K * K
  }

  const att: AttenuationValues = { K, N, dB, alpha }

  const equations: string[] = []
  if (unit === 'dB') {
    equations.push(
      `K = 10^(A[dB] / 20) = 10^(${dB} / 20) = ${K.toFixed(4)}  (veces de tensión)`,
      `N = 10^(A[dB] / 10) = 10^(${dB} / 10) = ${N.toFixed(4)}  (veces de potencia, para Zin = Zout)`,
      `α = ln(K) = ln(${K.toFixed(4)}) = ${alpha.toFixed(4)} Nepers`,
      `Verificación: A = 8,686 · α = 8,686 × ${alpha.toFixed(4)} = ${(8.686 * alpha).toFixed(4)} dB  ✓`
    )
  } else if (unit === 'K') {
    equations.push(
      `A[dB] = 20 · log10(K) = 20 · log10(${K.toFixed(4)}) = ${dB.toFixed(4)} dB`,
      `N = K² = ${K.toFixed(4)}² = ${N.toFixed(4)}  (para Zin = Zout)`,
      `α = ln(K) = ln(${K.toFixed(4)}) = ${alpha.toFixed(4)} Nepers`
    )
  } else if (unit === 'neper') {
    equations.push(
      `K = e^α = e^${alpha.toFixed(4)} = ${K.toFixed(4)}  (veces de tensión)`,
      `A[dB] = 8,686 · α = 8,686 × ${alpha.toFixed(4)} = ${dB.toFixed(4)} dB`,
      `N = K² = ${K.toFixed(4)}² = ${N.toFixed(4)}  (para Zin = Zout)`
    )
  }

  const step: SolutionStep = {
    title: 'Conversión de unidades de atenuación',
    explanation: `Dado ${unit === 'dB' ? `A = ${value} dB` : unit === 'K' ? `K = ${value}` : `α = ${value} Nepers`}, se calculan las representaciones equivalentes:`,
    equations,
    result: unit === 'dB'
      ? `K = ${K.toFixed(4)} | N = ${N.toFixed(4)} | α = ${alpha.toFixed(4)} Np`
      : unit === 'K'
      ? `A = ${dB.toFixed(4)} dB | N = ${N.toFixed(4)} | α = ${alpha.toFixed(4)} Np`
      : `K = ${K.toFixed(4)} | A = ${dB.toFixed(4)} dB | N = ${N.toFixed(4)}`,
    warnings: []
  }

  return {
    attenuation: att,
    steps: [step]
  }
}

export interface DesignParams {
  topology: Topology
  Z0?: number
  Z1?: number
  Z2?: number
  attenuation_dB?: number
}

export async function designAttenuator(params: DesignParams): Promise<DesignResult> {
  const topology = params.topology
  const Z0 = params.Z0 ?? 50
  const Z1 = params.Z1 ?? 50
  const Z2 = params.Z2 ?? 50
  const attenuation_dB = params.attenuation_dB ?? 0

  const convertRes = await convertAttenuation(attenuation_dB, 'dB')
  const att = convertRes.attenuation

  if (topology === 'T_symmetric') {
    return designTSymmetric(Z0, att)
  } else if (topology === 'pi_symmetric') {
    return designPiSymmetric(Z0, att)
  } else if (topology === 'T_asymmetric') {
    return designTAsymmetric(Z1, Z2, att)
  } else if (topology === 'pi_asymmetric') {
    return designPiAsymmetric(Z1, Z2, att)
  } else if (topology === 'L_minloss') {
    return designLMinloss(Z1, Z2)
  } else if (topology === 'T_bridged') {
    return designTBridged(Z0, att)
  }

  throw new Error(`Topología no soportada: ${topology}`)
}

function designTSymmetric(Z0: number, att: AttenuationValues): DesignResult {
  const K = att.K
  const alpha = att.alpha
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  if (K <= 1.0) {
    warnings.push("K = 1 corresponde a 0 dB. El T simétrico degenera en cortocircuito pasante (R1=0, R3=∞).")
  }

  steps.push({
    title: "Topología: T simétrico desbalanceado",
    explanation: `Circuito con dos brazos serie iguales (R1) y un brazo en derivación (R3). Impedancia característica: Z0 = ${Z0} Ω. Atenuación requerida: A = ${att.dB.toFixed(2)} dB → K = ${K.toFixed(4)}.`,
    equations: [],
    result: null,
    warnings: []
  })

  const R1 = Z0 * (K - 1) / (K + 1)
  const R3 = (K * K - 1) > 0 ? Z0 * 2 * K / (K * K - 1) : Infinity

  steps.push({
    title: "Cálculo por método aritmético",
    explanation: "Aplicando las fórmulas de diseño en función de Z0 y K:",
    equations: [
      `R1 = Z0 · (K − 1) / (K + 1)`,
      `R1 = ${Z0} · (${K.toFixed(4)} − 1) / (${K.toFixed(4)} + 1) = ${Z0} · ${(K - 1).toFixed(4)} / ${(K + 1).toFixed(4)}`,
      `R1 = ${R1.toFixed(2)} Ω`,
      ``,
      `R3 = Z0 · 2K / (K² − 1)`,
      `R3 = ${Z0} · 2 × ${K.toFixed(4)} / (${K.toFixed(4)}² − 1) = ${Z0} · ${(2 * K).toFixed(4)} / ${(K * K - 1).toFixed(4)}`,
      `R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω  |  R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
    warnings: []
  })

  const R1_hyp = alpha > 0 ? Z0 * Math.tanh(alpha / 2) : 0.0
  const R3_hyp = alpha > 0 ? Z0 / Math.sinh(alpha) : Infinity

  steps.push({
    title: "Verificación con fórmulas hiperbólicas",
    explanation: `Con α = ln(K) = ln(${K.toFixed(4)}) = ${alpha.toFixed(4)} Nepers:`,
    equations: [
      `R1 = Z0 · tanh(α/2) = ${Z0} · tanh(${(alpha / 2).toFixed(4)}) = ${R1_hyp.toFixed(2)} Ω  ✓`,
      `R3 = Z0 / sinh(α)   = ${Z0} / sinh(${alpha.toFixed(4)})     = ${R3_hyp === Infinity ? '∞' : `${R3_hyp.toFixed(2)} Ω`}  ✓`
    ],
    result: "Método aritmético e hiperbólico coinciden dentro de tolerancia numérica.",
    warnings: []
  })

  const step_warnings: string[] = []
  if (R1 < 0) {
    step_warnings.push(`R1 = ${R1.toFixed(4)} Ω < 0: el cuadripolo no es realizable con esta especificación.`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }
  if (R3 < 0) {
    step_warnings.push(`R3 = ${R3.toFixed(4)} Ω < 0: el cuadripolo no es realizable con esta especificación.`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }

  steps.push({
    title: "Resultado final",
    explanation: "Circuito T simétrico desbalanceado. Para la versión balanceada cada brazo serie se divide: R1/2 en cada ramal.",
    equations: [
      `Brazo serie entrada:  R1 = ${R1.toFixed(2)} Ω`,
      `Brazo derivación:     R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
      `Brazo serie salida:   R1 = ${R1.toFixed(2)} Ω`,
      `Impedancia característica: Z0 = ${Z0} Ω`,
      `Atenuación: A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω,  R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
    warnings: step_warnings
  })

  return {
    topology: "T_symmetric",
    resistors: { R1: Number(R1.toFixed(4)), R3: R3 === Infinity ? Infinity : Number(R3.toFixed(4)) },
    Z_in: Z0,
    Z_out: Z0,
    attenuation: att,
    steps,
    warnings
  }
}

function designPiSymmetric(Z0: number, att: AttenuationValues): DesignResult {
  const K = att.K
  const alpha = att.alpha
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  if (K <= 1.0) {
    warnings.push("K = 1 corresponde a 0 dB. El π simétrico no está definido para K = 1 (R1 → ∞).")
  }

  steps.push({
    title: "Topología: π simétrico desbalanceado",
    explanation: `Circuito con un brazo serie central (R3) y dos brazos en derivación iguales (R1). Impedancia característica: Z0 = ${Z0} Ω. Atenuación requerida: A = ${att.dB.toFixed(2)} dB → K = ${K.toFixed(4)}.`,
    equations: [],
    result: null,
    warnings: []
  })

  const R3 = Z0 * (K * K - 1) / (2 * K)
  const R1 = K > 1 ? Z0 * (K + 1) / (K - 1) : Infinity

  steps.push({
    title: "Cálculo por método aritmético",
    explanation: "Aplicando las fórmulas de diseño en función de Z0 y K:",
    equations: [
      `R3 = Z0 · (K² − 1) / (2K)`,
      `R3 = ${Z0} · (${K.toFixed(4)}² − 1) / (2 × ${K.toFixed(4)}) = ${Z0} · ${(K * K - 1).toFixed(4)} / ${(2 * K).toFixed(4)}`,
      `R3 = ${R3.toFixed(2)} Ω`,
      ``,
      `R1 = Z0 · (K + 1) / (K − 1)`,
      `R1 = ${Z0} · (${K.toFixed(4)} + 1) / (${K.toFixed(4)} − 1) = ${Z0} · ${(K + 1).toFixed(4)} / ${(K - 1).toFixed(4)}`,
      `R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`
    ],
    result: `R3 = ${R3.toFixed(2)} Ω  |  R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
    warnings: []
  })

  const R3_hyp = alpha > 0 ? Z0 * Math.sinh(alpha) : 0.0
  const R1_hyp = alpha > 0 ? Z0 / Math.tanh(alpha / 2) : Infinity

  steps.push({
    title: "Verificación con fórmulas hiperbólicas",
    explanation: `Con α = ln(K) = ln(${K.toFixed(4)}) = ${alpha.toFixed(4)} Nepers:`,
    equations: [
      `R3 = Z0 · sinh(α)    = ${Z0} · sinh(${alpha.toFixed(4)}) = ${R3_hyp.toFixed(2)} Ω  ✓`,
      `R1 = Z0 / tanh(α/2)  = ${Z0} / tanh(${(alpha / 2).toFixed(4)}) = ${R1_hyp === Infinity ? '∞' : `${R1_hyp.toFixed(2)} Ω`}  ✓`
    ],
    result: "Método aritmético e hiperbólico coinciden dentro de tolerancia numérica.",
    warnings: []
  })

  const step_warnings: string[] = []
  if (R3 < 0) {
    step_warnings.push(`R3 = ${R3.toFixed(4)} Ω < 0: el cuadripolo no es realizable.`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }
  if (R1 < 0) {
    step_warnings.push(`R1 = ${R1.toFixed(4)} Ω < 0: el cuadripolo no es realizable.`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }

  steps.push({
    title: "Resultado final",
    explanation: "Circuito π simétrico desbalanceado. Para la versión balanceada el brazo serie se dobla (2·R3) y cada derivación se divide a la mitad (R1/2 en cada ramal superior e inferior).",
    equations: [
      `Derivación entrada:   R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
      `Brazo serie:          R3 = ${R3.toFixed(2)} Ω`,
      `Derivación salida:    R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
      `Impedancia característica: Z0 = ${Z0} Ω`,
      `Atenuación: A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`
    ],
    result: `R3 = ${R3.toFixed(2)} Ω,  R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
    warnings: step_warnings
  })

  return {
    topology: "pi_symmetric",
    resistors: { R3: Number(R3.toFixed(4)), R1: R1 === Infinity ? Infinity : Number(R1.toFixed(4)) },
    Z_in: Z0,
    Z_out: Z0,
    attenuation: att,
    steps,
    warnings
  }
}

function designTAsymmetric(Z1: number, Z2: number, att: AttenuationValues): DesignResult {
  const K = att.K
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  const Z12 = Math.sqrt(Z1 * Z2)
  const Km = _k_min(Z1, Z2)
  const Am = Km > 1 ? 20 * Math.log10(Km) : 0.0

  if (K < Km - 1e-9) {
    warnings.push(`La atenuación mínima realizable para Z1=${Z1} Ω, Z2=${Z2} Ω es A_min = ${Am.toFixed(2)} dB (K_min = ${Km.toFixed(4)}). El valor solicitado K = ${K.toFixed(4)} genera resistencias negativas.`)
  }

  steps.push({
    title: "Topología: T asimétrico desbalanceado",
    explanation: `Circuito con dos brazos serie distintos (R1 en entrada, R2 en salida) y un brazo en derivación (R3). Z1 = ${Z1} Ω (entrada), Z2 = ${Z2} Ω (salida). Atenuación requerida: A = ${att.dB.toFixed(2)} dB → K = ${K.toFixed(4)}. Atenuación mínima realizable: A_min = ${Am.toFixed(2)} dB.`,
    equations: [],
    result: null,
    warnings: []
  })

  const R3 = 2 * K * Z12 / (K * K - 1)
  const R1 = (Z1 * (K * K + 1) - 2 * K * Z12) / (K * K - 1)
  const R2 = (Z2 * (K * K + 1) - 2 * K * Z12) / (K * K - 1)

  steps.push({
    title: "Cálculo por fórmulas de diseño",
    explanation: "Aplicando las fórmulas para T asimétrico con impedancias imagen Z1 y Z2:",
    equations: [
      `√(Z1·Z2) = √(${Z1}·${Z2}) = ${Z12.toFixed(4)} Ω`,
      ``,
      `R3 = 2K·√(Z1·Z2) / (K²−1)`,
      `R3 = 2×${K.toFixed(4)}×${Z12.toFixed(4)} / (${(K * K).toFixed(4)}−1) = ${R3.toFixed(2)} Ω`,
      ``,
      `R1 = [Z1·(K²+1) − 2K·√(Z1·Z2)] / (K²−1)`,
      `R1 = [${Z1}·${(K * K + 1).toFixed(4)} − 2×${K.toFixed(4)}×${Z12.toFixed(4)}] / ${(K * K - 1).toFixed(4)}`,
      `R1 = [${(Z1 * (K * K + 1)).toFixed(4)} − ${(2 * K * Z12).toFixed(4)}] / ${(K * K - 1).toFixed(4)} = ${R1.toFixed(2)} Ω`,
      ``,
      `R2 = [Z2·(K²+1) − 2K·√(Z1·Z2)] / (K²−1)`,
      `R2 = [${(Z2 * (K * K + 1)).toFixed(4)} − ${(2 * K * Z12).toFixed(4)}] / ${(K * K - 1).toFixed(4)} = ${R2.toFixed(2)} Ω`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω  |  R3 = ${R3.toFixed(2)} Ω  |  R2 = ${R2.toFixed(2)} Ω`,
    warnings: []
  })

  const inner_Z2 = R2 + Z2
  const shunt_12 = (R3 + inner_Z2) > 0 ? R3 * inner_Z2 / (R3 + inner_Z2) : 0.0
  const Z_in_v = R1 + shunt_12
  const inner_Z1 = R1 + Z1
  const shunt_21 = (R3 + inner_Z1) > 0 ? R3 * inner_Z1 / (R3 + inner_Z1) : 0.0
  const Z_out_v = R2 + shunt_21

  steps.push({
    title: "Verificación de impedancias imagen",
    explanation: "Comprobando Z_in y Z_out con la carga nominal conectada:",
    equations: [
      `Z_in = R1 + R3‖(R2+Z2) = ${R1.toFixed(2)} + ${shunt_12.toFixed(2)} = ${Z_in_v.toFixed(2)} Ω  (esperado: ${Z1} Ω)`,
      `Z_out = R2 + R3‖(R1+Z1) = ${R2.toFixed(2)} + ${shunt_21.toFixed(2)} = ${Z_out_v.toFixed(2)} Ω  (esperado: ${Z2} Ω)`
    ],
    result: `ΔZ_in = ${Math.abs(Z_in_v - Z1).toFixed(4)} Ω  |  ΔZ_out = ${Math.abs(Z_out_v - Z2).toFixed(4)} Ω`,
    warnings: []
  })

  const step_warnings: string[] = []
  const items = [["R1", R1], ["R2", R2], ["R3", R3]] as const
  for (const [name, val] of items) {
    if (val < -1e-9) {
      const msg = `${name} = ${val.toFixed(4)} Ω < 0: no realizable. Incrementar A por encima de A_min = ${Am.toFixed(2)} dB.`
      step_warnings.push(msg)
      warnings.push(msg)
    }
  }

  steps.push({
    title: "Resultado final",
    explanation: "Circuito T asimétrico desbalanceado.",
    equations: [
      `Brazo serie entrada: R1 = ${R1.toFixed(2)} Ω`,
      `Brazo derivación:    R3 = ${R3.toFixed(2)} Ω`,
      `Brazo serie salida:  R2 = ${R2.toFixed(2)} Ω`,
      `Impedancia entrada:  Z1 = ${Z1} Ω`,
      `Impedancia salida:   Z2 = ${Z2} Ω`,
      `Atenuación:          A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      `A_min realizable:    ${Am.toFixed(2)} dB  (K_min = ${Km.toFixed(4)})`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω,  R3 = ${R3.toFixed(2)} Ω,  R2 = ${R2.toFixed(2)} Ω`,
    warnings: step_warnings
  })

  return {
    topology: "T_asymmetric",
    resistors: { R1: Number(R1.toFixed(4)), R3: Number(R3.toFixed(4)), R2: Number(R2.toFixed(4)) },
    Z_in: Z1,
    Z_out: Z2,
    attenuation: att,
    steps,
    warnings
  }
}

function designPiAsymmetric(Z1: number, Z2: number, att: AttenuationValues): DesignResult {
  const K = att.K
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  const Z12 = Math.sqrt(Z1 * Z2)
  const Km = _k_min(Z1, Z2)
  const Am = Km > 1 ? 20 * Math.log10(Km) : 0.0

  if (K < Km - 1e-9) {
    warnings.push(`La atenuación mínima realizable para Z1=${Z1} Ω, Z2=${Z2} Ω es A_min = ${Am.toFixed(2)} dB (K_min = ${Km.toFixed(4)}). El valor solicitado K = ${K.toFixed(4)} genera resistencias no realizables.`)
  }

  steps.push({
    title: "Topología: π asimétrico desbalanceado",
    explanation: `Circuito con un brazo serie central (R3) y dos brazos en derivación distintos (R1 en entrada, R2 en salida). Z1 = ${Z1} Ω (entrada), Z2 = ${Z2} Ω (salida). Atenuación requerida: A = ${att.dB.toFixed(2)} dB → K = ${K.toFixed(4)}. Atenuación mínima realizable: A_min = ${Am.toFixed(2)} dB.`,
    equations: [],
    result: null,
    warnings: []
  })

  const R3 = Z12 * (K * K - 1) / (2 * K)

  const denom_R1 = K * K + 1 - 2 * K * Math.sqrt(Z1 / Z2)
  const denom_R2 = K * K + 1 - 2 * K * Math.sqrt(Z2 / Z1)
  const R1 = Math.abs(denom_R1) > 1e-12 ? Z1 * (K * K - 1) / denom_R1 : Infinity
  const R2 = Math.abs(denom_R2) > 1e-12 ? Z2 * (K * K - 1) / denom_R2 : Infinity

  steps.push({
    title: "Cálculo por fórmulas de diseño",
    explanation: "Aplicando las fórmulas para π asimétrico con impedancias imagen Z1 y Z2:",
    equations: [
      `√(Z1·Z2) = √(${Z1}·${Z2}) = ${Z12.toFixed(4)} Ω`,
      ``,
      `R3 = √(Z1·Z2)·(K²−1) / (2K)`,
      `R3 = ${Z12.toFixed(4)}×${(K * K - 1).toFixed(4)} / (2×${K.toFixed(4)}) = ${R3.toFixed(2)} Ω`,
      ``,
      `R1 = Z1·(K²−1) / (K²+1 − 2K·√(Z1/Z2))`,
      `R1 = ${Z1}×${(K * K - 1).toFixed(4)} / (${(K * K + 1).toFixed(4)} − 2×${K.toFixed(4)}×${Math.sqrt(Z1 / Z2).toFixed(4)})`,
      `R1 = ${(Z1 * (K * K - 1)).toFixed(4)} / ${denom_R1.toFixed(4)} = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
      ``,
      `R2 = Z2·(K²−1) / (K²+1 − 2K·√(Z2/Z1))`,
      `R2 = ${(Z2 * (K * K - 1)).toFixed(4)} / ${denom_R2.toFixed(4)} = ${R2 === Infinity ? '∞' : `${R2.toFixed(2)} Ω`}`
    ],
    result: `R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}  |  R3 = ${R3.toFixed(2)} Ω  |  R2 = ${R2 === Infinity ? '∞' : `${R2.toFixed(2)} Ω`}`,
    warnings: []
  })

  const inner2 = (R2 + Z2) > 0 && Math.abs(R2) !== Infinity ? R2 * Z2 / (R2 + Z2) : Z2
  const inner1 = (R1 + Z1) > 0 && Math.abs(R1) !== Infinity ? R1 * Z1 / (R1 + Z1) : Z1
  const Z_in_v = (R1 + R3 + inner2) > 0 && Math.abs(R1) !== Infinity ? R1 * (R3 + inner2) / (R1 + R3 + inner2) : 0.0
  const Z_out_v = (R2 + R3 + inner1) > 0 && Math.abs(R2) !== Infinity ? R2 * (R3 + inner1) / (R2 + R3 + inner1) : 0.0

  steps.push({
    title: "Verificación de impedancias imagen",
    explanation: "Comprobando Z_in y Z_out con la carga nominal conectada:",
    equations: [
      `Z_in = R1‖(R3 + R2‖Z2) = ${Z_in_v.toFixed(2)} Ω  (esperado: {Z1} Ω)`,
      `Z_out = R2‖(R3 + R1‖Z1) = ${Z_out_v.toFixed(2)} Ω  (esperado: {Z2} Ω)`
    ],
    result: `ΔZ_in = ${Math.abs(Z_in_v - Z1).toFixed(4)} Ω  |  ΔZ_out = ${Math.abs(Z_out_v - Z2).toFixed(4)} Ω`,
    warnings: []
  })

  const step_warnings: string[] = []
  const items = [["R1", R1], ["R2", R2], ["R3", R3]] as const
  for (const [name, val] of items) {
    if (!Number.isFinite(val) || val < -1e-9) {
      const msg = `${name} = ${val.toFixed(4)} Ω: no realizable. Incrementar A por encima de A_min = ${Am.toFixed(2)} dB.`
      step_warnings.push(msg)
      warnings.push(msg)
    }
  }

  steps.push({
    title: "Resultado final",
    explanation: "Circuito π asimétrico desbalanceado.",
    equations: [
      `Derivación entrada:  R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`}`,
      `Brazo serie:         R3 = ${R3.toFixed(2)} Ω`,
      `Derivación salida:   R2 = ${R2 === Infinity ? '∞' : `${R2.toFixed(2)} Ω`}`,
      `Impedancia entrada:  Z1 = ${Z1} Ω`,
      `Impedancia salida:   Z2 = ${Z2} Ω`,
      `Atenuación:          A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      `A_min realizable:    ${Am.toFixed(2)} dB  (K_min = ${Km.toFixed(4)})`
    ],
    result: `R1 = ${R1 === Infinity ? '∞' : `${R1.toFixed(2)} Ω`},  R3 = ${R3.toFixed(2)} Ω,  R2 = ${R2 === Infinity ? '∞' : `${R2.toFixed(2)} Ω`}`,
    warnings: step_warnings
  })

  return {
    topology: "pi_asymmetric",
    resistors: { R1: R1 === Infinity ? Infinity : Number(R1.toFixed(4)), R3: Number(R3.toFixed(4)), R2: R2 === Infinity ? Infinity : Number(R2.toFixed(4)) },
    Z_in: Z1,
    Z_out: Z2,
    attenuation: att,
    steps,
    warnings
  }
}

function designLMinloss(Z1: number, Z2: number): DesignResult {
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  let swapped = false
  if (Z1 < Z2) {
    const temp = Z1
    Z1 = Z2
    Z2 = temp
    swapped = true
  }

  if (swapped) {
    warnings.push(`Se intercambiaron los puertos: la entrada queda en Z1=${Z1} Ω (alta impedancia). El circuito L es unidireccional — conectar la fuente de alta impedancia en el puerto 1.`)
  }

  let Rs = 0.0
  let Rp = Infinity
  let K_min = 1.0
  let A_min = 0.0

  if (Math.abs(Z1 - Z2) >= 1e-9) {
    Rs = Math.sqrt(Z1 * (Z1 - Z2))
    Rp = Z1 * Z2 / Rs
    K_min = Math.sqrt(Z1 / Z2) + Math.sqrt(Z1 / Z2 - 1)
    A_min = 20 * Math.log10(K_min)
  }

  const alpha = K_min > 1 ? Math.log(K_min) : 0.0
  const att: AttenuationValues = { K: K_min, N: K_min * K_min, dB: A_min, alpha }

  steps.push({
    title: "Topología: adaptador tipo L de pérdida mínima",
    explanation: `Circuito L con brazo serie (Rs) en el lado de alta impedancia (Z1=${Z1} Ω) y brazo en derivación (Rp) en el lado de baja impedancia (Z2=${Z2} Ω). La atenuación no se puede especificar: el circuito opera con la pérdida mínima intrínseca.`,
    equations: [],
    result: null,
    warnings: []
  })

  const n = Z2 > 0 ? Z1 / Z2 : Infinity
  steps.push({
    title: "Cálculo de la atenuación mínima",
    explanation: "La pérdida mínima realizable para adaptar Z1 a Z2 (con Z1 > Z2) es:",
    equations: [
      `n = Z1/Z2 = ${Z1}/${Z2} = ${n.toFixed(4)}`,
      ``,
      `K_min = √n + √(n−1) = √${n.toFixed(4)} + √${(n - 1).toFixed(4)}`,
      `K_min = ${Math.sqrt(n).toFixed(4)} + ${Math.sqrt(Math.max(n - 1, 0)).toFixed(4)} = ${K_min.toFixed(4)}`,
      ``,
      `A_min = 20·log₁₀(K_min) = 20·log₁₀(${K_min.toFixed(4)}) = ${A_min.toFixed(2)} dB`
    ],
    result: `A_min = ${A_min.toFixed(2)} dB  (K_min = ${K_min.toFixed(4)})`,
    warnings: []
  })

  const Rp_par_Z2 = (Rp + Z2) > 0 && Math.abs(Rp) !== Infinity ? Rp * Z2 / (Rp + Z2) : Z2
  const Z_in_v = Rs + Rp_par_Z2
  const Z_out_v = (Rp + Rs + Z1) > 0 && Math.abs(Rp) !== Infinity ? Rp * (Rs + Z1) / (Rp + Rs + Z1) : 0.0

  steps.push({
    title: "Cálculo de resistencias y verificación",
    explanation: "Aplicando las fórmulas del adaptador tipo L:",
    equations: [
      `Rs = √(Z1·(Z1−Z2)) = √(${Z1}·${(Z1 - Z2).toFixed(4)}) = ${Rs.toFixed(4)} Ω`,
      `Rp = Z1·Z2 / Rs = ${Z1}×${Z2} / ${Rs.toFixed(4)} = ${Rp === Infinity ? '∞' : `${Rp.toFixed(4)} Ω`}`,
      ``,
      `Verificación Z_in: Rs + Rp‖Z2 = ${Rs.toFixed(2)} + ${Rp_par_Z2.toFixed(2)} = ${Z_in_v.toFixed(2)} Ω  (esperado: ${Z1} Ω)`,
      `Verificación Z_out: Rp‖(Rs+Z1) = ${Z_out_v.toFixed(2)} Ω  (esperado: {Z2} Ω)`
    ],
    result: `Rs = ${Rs.toFixed(2)} Ω,  Rp = ${Rp === Infinity ? '∞' : `${Rp.toFixed(2)} Ω`},  A_min = ${A_min.toFixed(2)} dB`,
    warnings: []
  })

  steps.push({
    title: "Resultado final",
    explanation: "Adaptador tipo L de pérdida mínima — circuito desbalanceado.",
    equations: [
      `Brazo serie:         Rs = ${Rs.toFixed(2)} Ω`,
      `Brazo derivación:    Rp = ${Rp === Infinity ? '∞' : `${Rp.toFixed(2)} Ω`}`,
      `Impedancia entrada:  Z1 = ${Z1} Ω  (alta)`,
      `Impedancia salida:   Z2 = ${Z2} Ω  (baja)`,
      `Atenuación mínima:   A_min = ${A_min.toFixed(2)} dB  (K_min = ${K_min.toFixed(4)})`
    ],
    result: `Rs = ${Rs.toFixed(2)} Ω,  Rp = ${Rp === Infinity ? '∞' : `${Rp.toFixed(2)} Ω`}`,
    warnings: swapped ? warnings : []
  })

  return {
    topology: "L_minloss",
    resistors: { Rs: Number(Rs.toFixed(4)), Rp: Rp === Infinity ? Infinity : Number(Rp.toFixed(4)) },
    Z_in: Z1,
    Z_out: Z2,
    attenuation: att,
    steps,
    warnings
  }
}

function designTBridged(Z0: number, att: AttenuationValues): DesignResult {
  const K = att.K
  const steps: SolutionStep[] = []
  const warnings: string[] = []

  if (K <= 1.0) {
    warnings.push("K = 1 corresponde a 0 dB. El T puenteado degenera en cortocircuito pasante (R4=0, R3=∞).")
  }

  steps.push({
    title: "Topología: T puenteado (bridged T)",
    explanation: `Circuito con dos brazos serie iguales (R1=R2=Z0), una resistencia puente (R4), y una resistencia de derivación central (R3). Impedancia característica: Z0 = ${Z0} Ω. Atenuación requerida: A = ${att.dB.toFixed(2)} dB → K = ${K.toFixed(4)}.`,
    equations: [],
    result: null,
    warnings: []
  })

  const R1 = Z0
  const R2 = Z0
  const R4 = Z0 * (K - 1)
  const R3 = K > 1 ? Z0 / (K - 1) : Infinity

  steps.push({
    title: "Cálculo por método aritmético",
    explanation: "Aplicando las fórmulas de diseño para T puenteado:",
    equations: [
      `R1 = Z0 = ${Z0} Ω`,
      `R2 = Z0 = ${Z0} Ω`,
      ``,
      `R4 = Z0 · (K − 1)`,
      `R4 = ${Z0} · (${K.toFixed(4)} − 1) = ${Z0} · ${(K - 1).toFixed(4)}`,
      `R4 = ${R4.toFixed(2)} Ω`,
      ``,
      `R3 = Z0 / (K − 1)`,
      `R3 = ${Z0} / (${K.toFixed(4)} − 1) = ${Z0} / ${(K - 1).toFixed(4)}`,
      `R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω  |  R2 = ${R2.toFixed(2)} Ω  |  R4 = ${R4.toFixed(2)} Ω  |  R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
    warnings: []
  })

  const K_verify = Z0 > 0 ? 1 + R4 / Z0 : Infinity
  const product = Math.abs(R3) !== Infinity ? R4 * R3 : Infinity
  const product_expected = Z0 * Z0

  const R2_plus_ZL = R2 + Z0
  const R3_par = Math.abs(R3) !== Infinity && (R3 + R2_plus_ZL) > 0 ? R3 * R2_plus_ZL / (R3 + R2_plus_ZL) : R2_plus_ZL
  const path_series = R1 + R3_par
  const path_bridge = R4 + Z0
  const Z_in_v = (path_series + path_bridge) > 0 ? path_series * path_bridge / (path_series + path_bridge) : 0.0

  const eqs_verify = [
    `K = 1 + R4/Z0 = 1 + ${R4.toFixed(2)}/${Z0} = ${K_verify.toFixed(4)}  (esperado: ${K.toFixed(4)})  ✓`,
    ``,
    `R4 · R3 = ${R4.toFixed(2)} × ${R3 === Infinity ? '∞' : R3.toFixed(2)} = ${product === Infinity ? '∞' : product.toFixed(2)}`,
    `Z0²     = ${Z0}² = ${product_expected.toFixed(2)}  ✓`,
    ``,
    `Z_in = (R4+Z0) ‖ (R1 + R3‖(R2+Z0))`,
    `Z_in = ${path_bridge.toFixed(2)} ‖ ${path_series.toFixed(2)} = ${Z_in_v.toFixed(2)} Ω  (esperado: ${Z0} Ω)  ✓`
  ]

  steps.push({
    title: "Verificación de atenuación e impedancia",
    explanation: "Comprobando K, propiedad del producto R4·R3 = Z0², e impedancia de entrada:",
    equations: eqs_verify,
    result: `Atenuación verificada: A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
    warnings: []
  })

  const step_warnings: string[] = []
  if (R4 < 0) {
    step_warnings.push(`R4 = ${R4.toFixed(4)} Ω < 0: no realizable.`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }
  if (R3 < 0 || Math.abs(R3) === Infinity) {
    step_warnings.push(`R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(4)}`}: no realizable (derivación infinita o negativa).`)
    warnings.push(step_warnings[step_warnings.length - 1])
  }

  steps.push({
    title: "Resultado final",
    explanation: "Circuito T puenteado desbalanceado. Característica: R1=R2=Z0 (brazos serie fijos), R4 y R3 varían con la atenuación. Ventaja: permite cambiar atenuación sin modificar impedancia característica.",
    equations: [
      `Brazo serie entrada:   R1 = ${R1.toFixed(2)} Ω`,
      `Brazo serie salida:    R2 = ${R2.toFixed(2)} Ω`,
      `Resistencia puente:    R4 = ${R4.toFixed(2)} Ω`,
      `Derivación central:    R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
      `Impedancia característica: Z0 = ${Z0} Ω`,
      `Atenuación: A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`
    ],
    result: `R1 = ${R1.toFixed(2)} Ω,  R2 = ${R2.toFixed(2)} Ω,  R4 = ${R4.toFixed(2)} Ω,  R3 = ${R3 === Infinity ? '∞' : `${R3.toFixed(2)} Ω`}`,
    warnings: step_warnings
  })

  return {
    topology: "T_bridged",
    resistors: { R1: Number(R1.toFixed(4)), R2: Number(R2.toFixed(4)), R4: Number(R4.toFixed(4)), R3: R3 === Infinity ? Infinity : Number(R3.toFixed(4)) },
    Z_in: Z0,
    Z_out: Z0,
    attenuation: att,
    steps,
    warnings
  }
}
