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

// ═════════════════════════════════════════════════════════════════════════════
//   MVP 4: Análisis directo — Dado resistencias, calcular Z₀/Z₁/Z₂ y A en dB
// ═════════════════════════════════════════════════════════════════════════════

export interface AnalysisParams {
  topology: Topology
  resistors: Record<string, number>
}

export interface AnalysisResult {
  topology: string
  resistors: Record<string, number>
  Z_in: number
  Z_out: number
  attenuation: AttenuationValues
  steps: SolutionStep[]
  warnings: string[]
}

function _attFromK(K: number): AttenuationValues {
  const dB = 20 * Math.log10(K)
  const alpha = Math.log(K)
  return { K, N: K * K, dB, alpha }
}

export async function analyzeAttenuator(params: AnalysisParams): Promise<AnalysisResult> {
  const { topology, resistors } = params
  if (topology === 'T_symmetric')   return analyzeTSym(resistors)
  if (topology === 'pi_symmetric')  return analyzePiSym(resistors)
  if (topology === 'T_asymmetric')  return analyzeTAsym(resistors)
  if (topology === 'pi_asymmetric') return analyzePiAsym(resistors)
  if (topology === 'L_minloss')     return analyzeL(resistors)
  if (topology === 'T_bridged')     return analyzeTBridged(resistors)
  throw new Error(`Topología no soportada: ${topology}`)
}

function analyzeTSym(r: Record<string, number>): AnalysisResult {
  const R1 = r['R1'] ?? 0
  const R3 = r['R3'] ?? 0
  if (R1 <= 0 || R3 <= 0) throw new Error('R1 y R3 deben ser positivos.')

  const Z0 = Math.sqrt(R1 * (R1 + 2 * R3))
  const K = (R3 + R1 + Math.sqrt(R1 * (R1 + 2 * R3))) / R3
  const att = _attFromK(K)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: T simétrico — análisis directo',
      explanation: `Dadas R1 = ${R1} Ω (brazos serie iguales) y R3 = ${R3} Ω (derivación), se calcula la impedancia característica Z₀ y la atenuación A.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de la impedancia característica',
      explanation: 'Para T simétrico, la impedancia imagen es:',
      equations: [
        `Z₀ = √(R1 · (R1 + 2·R3))`,
        `Z₀ = √(${R1} · (${R1} + 2×${R3}))`,
        `Z₀ = √(${R1} · ${(R1 + 2 * R3).toFixed(4)}) = √${(R1 * (R1 + 2 * R3)).toFixed(4)}`,
        `Z₀ = ${Z0.toFixed(2)} Ω`
      ],
      result: `Z₀ = ${Z0.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'A partir de K = (Z₀ + R1)/(Z₀ − R1) o equivalentemente:',
      equations: [
        `K = (R3 + R1 + √(R1·(R1+2R3))) / R3`,
        `K = (${R3} + ${R1} + ${Z0.toFixed(4)}) / ${R3}`,
        `K = ${(R3 + R1 + Z0).toFixed(4)} / ${R3} = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = 20·log₁₀(${K.toFixed(4)}) = ${att.dB.toFixed(2)} dB`,
        `α = ln(K) = ${att.alpha.toFixed(4)} Nepers`
      ],
      result: `A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings: []
    }
  ]

  return { topology: 'T_symmetric', resistors: { R1, R3 }, Z_in: Number(Z0.toFixed(4)), Z_out: Number(Z0.toFixed(4)), attenuation: att, steps, warnings: [] }
}

function analyzePiSym(r: Record<string, number>): AnalysisResult {
  const R1 = r['R1'] ?? 0
  const R3 = r['R3'] ?? 0
  if (R1 <= 0 || R3 <= 0) throw new Error('R1 y R3 deben ser positivos.')

  const Z0 = R1 * Math.sqrt(R3 / (2 * R1 + R3))
  const K = (R1 + R3 + Math.sqrt(R3 * (2 * R1 + R3))) / R1
  const att = _attFromK(K)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: π simétrico — análisis directo',
      explanation: `Dadas R3 = ${R3} Ω (brazo serie central) y R1 = ${R1} Ω (derivaciones iguales), se calcula la impedancia característica Z₀ y la atenuación A.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de la impedancia característica',
      explanation: 'Para π simétrico, la impedancia imagen es:',
      equations: [
        `Z₀ = R1 · √(R3 / (2·R1 + R3))`,
        `Z₀ = ${R1} · √(${R3} / ${(2 * R1 + R3).toFixed(4)})`,
        `Z₀ = ${R1} · √${(R3 / (2 * R1 + R3)).toFixed(4)} = ${R1} · ${Math.sqrt(R3 / (2 * R1 + R3)).toFixed(4)}`,
        `Z₀ = ${Z0.toFixed(2)} Ω`
      ],
      result: `Z₀ = ${Z0.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'Aplicando la fórmula:',
      equations: [
        `K = (R1 + R3 + √(R3·(2R1+R3))) / R1`,
        `K = (${R1} + ${R3} + √${(R3 * (2 * R1 + R3)).toFixed(4)}) / ${R1}`,
        `K = ${(R1 + R3 + Math.sqrt(R3 * (2 * R1 + R3))).toFixed(4)} / ${R1} = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = ${att.dB.toFixed(2)} dB`,
        `α = ln(K) = ${att.alpha.toFixed(4)} Nepers`
      ],
      result: `A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings: []
    }
  ]

  return { topology: 'pi_symmetric', resistors: { R1, R3 }, Z_in: Number(Z0.toFixed(4)), Z_out: Number(Z0.toFixed(4)), attenuation: att, steps, warnings: [] }
}

function analyzeTAsym(r: Record<string, number>): AnalysisResult {
  const R1 = r['R1'] ?? 0
  const R2 = r['R2'] ?? 0
  const R3 = r['R3'] ?? 0
  if (R1 <= 0 || R2 <= 0 || R3 <= 0) throw new Error('R1, R2 y R3 deben ser positivos.')

  // ABCD T network (Z1=R1, Z3=R3 shunt, Z2=R2)
  const A = 1 + R1 / R3
  const B = R1 + R2 + (R1 * R2) / R3
  const C = 1 / R3
  const D = 1 + R2 / R3
  const Z1 = Math.sqrt((A * B) / (C * D))
  const Z2 = Math.sqrt((D * B) / (C * A))
  const K = Math.sqrt(A * D) + Math.sqrt(B * C)
  const att = _attFromK(K)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: T asimétrico — análisis directo',
      explanation: `Dadas R1 = ${R1} Ω, R3 = ${R3} Ω y R2 = ${R2} Ω, se calculan las impedancias imagen Z₁, Z₂ y la atenuación A.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Parámetros ABCD del cuadripolo',
      explanation: 'Multiplicando las matrices de serie–derivación–serie:',
      equations: [
        `A = 1 + R1/R3 = 1 + ${R1}/${R3} = ${A.toFixed(4)}`,
        `B = R1 + R2 + R1·R2/R3 = ${R1} + ${R2} + ${(R1 * R2 / R3).toFixed(4)} = ${B.toFixed(4)} Ω`,
        `C = 1/R3 = 1/${R3} = ${C.toFixed(6)} S`,
        `D = 1 + R2/R3 = 1 + ${R2}/${R3} = ${D.toFixed(4)}`
      ],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de impedancias imagen',
      explanation: 'Aplicando las definiciones de impedancia imagen:',
      equations: [
        `Z₁ = √(A·B / (C·D)) = √(${A.toFixed(4)}·${B.toFixed(4)} / (${C.toFixed(6)}·${D.toFixed(4)}))`,
        `Z₁ = √(${(A * B).toFixed(4)} / ${(C * D).toFixed(6)}) = ${Z1.toFixed(2)} Ω`,
        ``,
        `Z₂ = √(D·B / (C·A)) = √(${(D * B).toFixed(4)} / ${(C * A).toFixed(6)}) = ${Z2.toFixed(2)} Ω`
      ],
      result: `Z₁ = ${Z1.toFixed(2)} Ω  |  Z₂ = ${Z2.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'La atenuación imagen está dada por K = √(A·D) + √(B·C):',
      equations: [
        `K = √(${(A * D).toFixed(4)}) + √(${(B * C).toFixed(4)}) = ${Math.sqrt(A * D).toFixed(4)} + ${Math.sqrt(B * C).toFixed(4)}`,
        `K = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = ${att.dB.toFixed(2)} dB`,
        `α = ln(K) = ${att.alpha.toFixed(4)} Nepers`
      ],
      result: `A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings: []
    }
  ]

  return { topology: 'T_asymmetric', resistors: { R1, R3, R2 }, Z_in: Number(Z1.toFixed(4)), Z_out: Number(Z2.toFixed(4)), attenuation: att, steps, warnings: [] }
}

function analyzePiAsym(r: Record<string, number>): AnalysisResult {
  const R1 = r['R1'] ?? 0
  const R2 = r['R2'] ?? 0
  const R3 = r['R3'] ?? 0
  if (R1 <= 0 || R2 <= 0 || R3 <= 0) throw new Error('R1, R2 y R3 deben ser positivos.')

  // ABCD π network (Y1 shunt input, Z3 series, Y2 shunt output)
  const A = 1 + R3 / R2
  const B = R3
  const C = 1 / R1 + 1 / R2 + R3 / (R1 * R2)
  const D = 1 + R3 / R1
  const Z1 = Math.sqrt((A * B) / (C * D))
  const Z2 = Math.sqrt((D * B) / (C * A))
  const K = Math.sqrt(A * D) + Math.sqrt(B * C)
  const att = _attFromK(K)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: π asimétrico — análisis directo',
      explanation: `Dadas R1 = ${R1} Ω (derivación entrada), R3 = ${R3} Ω (serie) y R2 = ${R2} Ω (derivación salida), se calculan las impedancias imagen Z₁, Z₂ y la atenuación A.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Parámetros ABCD del cuadripolo',
      explanation: 'Multiplicando las matrices de derivación–serie–derivación:',
      equations: [
        `A = 1 + R3/R2 = ${A.toFixed(4)}`,
        `B = R3 = ${R3} Ω`,
        `C = 1/R1 + 1/R2 + R3/(R1·R2) = ${(1 / R1).toFixed(6)} + ${(1 / R2).toFixed(6)} + ${(R3 / (R1 * R2)).toFixed(6)} = ${C.toFixed(6)} S`,
        `D = 1 + R3/R1 = ${D.toFixed(4)}`
      ],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de impedancias imagen',
      explanation: 'Aplicando las definiciones de impedancia imagen:',
      equations: [
        `Z₁ = √(A·B / (C·D)) = √(${(A * B).toFixed(4)} / ${(C * D).toFixed(6)}) = ${Z1.toFixed(2)} Ω`,
        `Z₂ = √(D·B / (C·A)) = √(${(D * B).toFixed(4)} / ${(C * A).toFixed(6)}) = ${Z2.toFixed(2)} Ω`
      ],
      result: `Z₁ = ${Z1.toFixed(2)} Ω  |  Z₂ = ${Z2.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'La atenuación imagen está dada por K = √(A·D) + √(B·C):',
      equations: [
        `K = √(${(A * D).toFixed(4)}) + √(${(B * C).toFixed(4)}) = ${Math.sqrt(A * D).toFixed(4)} + ${Math.sqrt(B * C).toFixed(4)}`,
        `K = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = ${att.dB.toFixed(2)} dB`,
        `α = ln(K) = ${att.alpha.toFixed(4)} Nepers`
      ],
      result: `A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings: []
    }
  ]

  return { topology: 'pi_asymmetric', resistors: { R1, R3, R2 }, Z_in: Number(Z1.toFixed(4)), Z_out: Number(Z2.toFixed(4)), attenuation: att, steps, warnings: [] }
}

function analyzeL(r: Record<string, number>): AnalysisResult {
  const Rs = r['Rs'] ?? 0
  const Rp = r['Rp'] ?? 0
  if (Rs <= 0 || Rp <= 0) throw new Error('Rs y Rp deben ser positivos.')

  const Z1 = Math.sqrt(Rs * (Rp + Rs))
  const Z2 = Rp * Math.sqrt(Rs / (Rs + Rp))
  const K = Math.sqrt(1 + Rs / Rp) + Math.sqrt(Rs / Rp)
  const att = _attFromK(K)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: adaptador L — análisis directo',
      explanation: `Dadas Rs = ${Rs} Ω (brazo serie) y Rp = ${Rp} Ω (brazo derivación), se calculan las impedancias imagen Z₁ (alta), Z₂ (baja) y la atenuación intrínseca.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de impedancias',
      explanation: 'Aplicando las fórmulas del adaptador L:',
      equations: [
        `Z₁ = √(Rs·(Rs+Rp)) = √(${Rs}·${(Rs + Rp).toFixed(4)}) = √${(Rs * (Rs + Rp)).toFixed(4)} = ${Z1.toFixed(2)} Ω  (alta)`,
        `Z₂ = Rp·√(Rs/(Rs+Rp)) = ${Rp}·√${(Rs / (Rs + Rp)).toFixed(4)} = ${Z2.toFixed(2)} Ω  (baja)`,
        ``,
        `Relación n = Z₁/Z₂ = ${(Z1 / Z2).toFixed(4)}`
      ],
      result: `Z₁ = ${Z1.toFixed(2)} Ω  |  Z₂ = ${Z2.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'La atenuación intrínseca del adaptador es:',
      equations: [
        `K = √(1 + Rs/Rp) + √(Rs/Rp)`,
        `K = √${(1 + Rs / Rp).toFixed(4)} + √${(Rs / Rp).toFixed(4)} = ${Math.sqrt(1 + Rs / Rp).toFixed(4)} + ${Math.sqrt(Rs / Rp).toFixed(4)}`,
        `K = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = ${att.dB.toFixed(2)} dB  (atenuación mínima entre Z₁ y Z₂)`
      ],
      result: `A_min = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings: []
    }
  ]

  return { topology: 'L_minloss', resistors: { Rs, Rp }, Z_in: Number(Z1.toFixed(4)), Z_out: Number(Z2.toFixed(4)), attenuation: att, steps, warnings: [] }
}

function analyzeTBridged(r: Record<string, number>): AnalysisResult {
  const R1 = r['R1'] ?? 0
  const R2 = r['R2'] ?? 0
  const R3 = r['R3'] ?? 0
  const R4 = r['R4'] ?? 0
  if (R1 <= 0 || R2 <= 0 || R3 <= 0 || R4 <= 0) throw new Error('Todas las resistencias deben ser positivas.')

  const Z0_geom = Math.sqrt(R3 * R4)
  const Z0_arm = (R1 + R2) / 2
  const Z0 = Z0_geom
  const K = 1 + R4 / Z0
  const att = _attFromK(K)
  const warnings: string[] = []

  if (Math.abs(R1 - R2) > 1e-6) warnings.push(`R1 = ${R1} Ω ≠ R2 = ${R2} Ω: el T puenteado debe ser simétrico (R1 = R2 = Z₀).`)
  if (Math.abs(Z0_arm - Z0_geom) > 1e-6 * Z0_geom) warnings.push(`(R1+R2)/2 = ${Z0_arm.toFixed(2)} ≠ √(R3·R4) = ${Z0_geom.toFixed(2)}: red mal balanceada.`)

  const steps: SolutionStep[] = [
    {
      title: 'Topología: T puenteado — análisis directo',
      explanation: `Dadas R1 = ${R1} Ω, R2 = ${R2} Ω (brazos serie), R3 = ${R3} Ω (derivación central) y R4 = ${R4} Ω (puente), se calcula Z₀ y la atenuación A.`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Cálculo de la impedancia característica',
      explanation: 'En T puenteado se cumple la relación R3·R4 = Z₀² (puente balanceado):',
      equations: [
        `Z₀ = √(R3 · R4) = √(${R3} × ${R4}) = √${(R3 * R4).toFixed(4)}`,
        `Z₀ = ${Z0.toFixed(2)} Ω`,
        ``,
        `Verificación: R1 = R2 = Z₀ → ${R1} Ω = ${R2} Ω = ${Z0.toFixed(2)} Ω`
      ],
      result: `Z₀ = ${Z0.toFixed(2)} Ω`,
      warnings: []
    },
    {
      title: 'Cálculo de la atenuación',
      explanation: 'La atenuación se obtiene del puente:',
      equations: [
        `K = 1 + R4/Z₀ = 1 + ${R4}/${Z0.toFixed(2)} = 1 + ${(R4 / Z0).toFixed(4)}`,
        `K = ${K.toFixed(4)}`,
        ``,
        `A = 20·log₁₀(K) = ${att.dB.toFixed(2)} dB`
      ],
      result: `A = ${att.dB.toFixed(2)} dB  (K = ${K.toFixed(4)})`,
      warnings
    }
  ]

  return { topology: 'T_bridged', resistors: { R1, R2, R3, R4 }, Z_in: Number(Z0.toFixed(4)), Z_out: Number(Z0.toFixed(4)), attenuation: att, steps, warnings }
}

// ═════════════════════════════════════════════════════════════════════════════
//   MVP 5: Atenuador por pasos — Lista de valores en dB con misma Z₀
// ═════════════════════════════════════════════════════════════════════════════

export interface StepsDesignParams {
  topology: Exclude<Topology, 'L_minloss'>
  Z0?: number
  Z1?: number
  Z2?: number
  dB_list: number[]
}

export interface StepCell {
  dB: number
  K: number
  topology: string
  resistors: Record<string, number>
  Z_in: number
  Z_out: number
  warnings: string[]
}

export interface StepsDesignResult {
  topology: string
  cells: StepCell[]
  steps: SolutionStep[]
  warnings: string[]
}

export async function designSteps(params: StepsDesignParams): Promise<StepsDesignResult> {
  const { topology, dB_list } = params
  if (!dB_list || dB_list.length === 0) throw new Error('Ingresá al menos un valor de atenuación.')
  for (const v of dB_list) {
    if (!isFinite(v) || v < 0) throw new Error(`Valor inválido en la lista: ${v}. Debe ser ≥ 0.`)
  }

  const isSym = topology === 'T_symmetric' || topology === 'pi_symmetric' || topology === 'T_bridged'
  const cells: StepCell[] = []
  const allWarnings: string[] = []

  if (isSym) {
    const Z0 = params.Z0 ?? 50
    if (Z0 <= 0) throw new Error('Z₀ debe ser positivo.')
    for (const dB of dB_list) {
      const res = await designAttenuator({ topology, Z0, attenuation_dB: dB })
      cells.push({
        dB,
        K: res.attenuation.K,
        topology: res.topology,
        resistors: res.resistors,
        Z_in: res.Z_in,
        Z_out: res.Z_out,
        warnings: res.warnings
      })
      if (res.warnings.length > 0) allWarnings.push(...res.warnings.map(w => `${dB} dB: ${w}`))
    }
  } else {
    const Z1 = params.Z1 ?? 50
    const Z2 = params.Z2 ?? 50
    if (Z1 <= 0 || Z2 <= 0) throw new Error('Z₁ y Z₂ deben ser positivos.')
    const Km = _k_min(Z1, Z2)
    const Am = Km > 1 ? 20 * Math.log10(Km) : 0
    for (const dB of dB_list) {
      const res = await designAttenuator({ topology, Z1, Z2, attenuation_dB: dB })
      cells.push({
        dB,
        K: res.attenuation.K,
        topology: res.topology,
        resistors: res.resistors,
        Z_in: res.Z_in,
        Z_out: res.Z_out,
        warnings: res.warnings
      })
      if (dB < Am - 1e-6) allWarnings.push(`${dB} dB es menor que A_min = ${Am.toFixed(2)} dB: paso no realizable.`)
    }
  }

  const summaryEqs: string[] = []
  for (const c of cells) {
    const rs = Object.entries(c.resistors)
      .map(([k, v]) => `${k}=${isFinite(v) ? v.toFixed(2) : '∞'}Ω`).join('  ')
    summaryEqs.push(`A = ${c.dB} dB  (K = ${c.K.toFixed(4)})  →  ${rs}`)
  }

  const explanation = isSym
    ? `Atenuador por pasos en topología ${topology}, con Z₀ = ${params.Z0} Ω. Se diseña un cuadripolo independiente por cada paso solicitado.`
    : `Atenuador por pasos en topología ${topology}, con Z₁ = ${params.Z1} Ω y Z₂ = ${params.Z2} Ω. Se diseña un cuadripolo independiente por cada paso.`

  const steps: SolutionStep[] = [
    {
      title: 'Diseño por pasos',
      explanation,
      equations: summaryEqs,
      result: `${cells.length} paso(s) diseñado(s).`,
      warnings: allWarnings
    }
  ]

  return { topology, cells, steps, warnings: allWarnings }
}

// ═════════════════════════════════════════════════════════════════════════════
//   MVP 6: Atenuador en escalera (ladder) — cascada T o π fusionando comunes
// ═════════════════════════════════════════════════════════════════════════════

export interface LadderDesignParams {
  cellType: 'T_symmetric' | 'pi_symmetric'
  Z0: number
  dB_list: number[]   // attenuation of each cell, in dB
}

export interface LadderCell {
  index: number
  dB: number
  K: number
  R_series: number    // R1 series-arm for T; R3 series-arm for π
  R_shunt: number     // R3 shunt for T; R1 shunt for π (each side)
}

export interface LadderElement {
  kind: 'series' | 'shunt'
  label: string       // human-readable label
  value: number       // resistor value (Ω)
  origin: string      // which cell(s) this came from
}

export interface LadderDesignResult {
  cellType: 'T_symmetric' | 'pi_symmetric'
  Z0: number
  cells: LadderCell[]
  network: LadderElement[]  // linearised ladder, alternating series–shunt
  steps: SolutionStep[]
  warnings: string[]
}

export async function designLadder(params: LadderDesignParams): Promise<LadderDesignResult> {
  const { cellType, Z0, dB_list } = params
  if (!dB_list || dB_list.length === 0) throw new Error('Ingresá al menos un paso.')
  for (const v of dB_list) {
    if (!isFinite(v) || v <= 0) throw new Error(`Paso inválido: ${v}. Debe ser > 0 dB.`)
  }
  if (Z0 <= 0) throw new Error('Z₀ debe ser positivo.')

  const cells: LadderCell[] = []
  for (let i = 0; i < dB_list.length; i++) {
    const dB = dB_list[i]
    const K = Math.pow(10, dB / 20)
    if (cellType === 'T_symmetric') {
      const R1 = Z0 * (K - 1) / (K + 1)
      const R3 = (K * K - 1) > 0 ? Z0 * 2 * K / (K * K - 1) : Infinity
      cells.push({ index: i + 1, dB, K, R_series: R1, R_shunt: R3 })
    } else {
      // π symmetric
      const R3 = Z0 * (K * K - 1) / (2 * K)
      const R1 = K > 1 ? Z0 * (K + 1) / (K - 1) : Infinity
      cells.push({ index: i + 1, dB, K, R_series: R3, R_shunt: R1 })
    }
  }

  // Build the linearised ladder:
  //   T:  R1_1 — R3_1 — (R1_1 + R1_2) — R3_2 — (R1_2 + R1_3) — ... — R1_N
  //   π:  R1_1 — R3_1 — (R1_1 ∥ R1_2) — R3_2 — ...                  — R1_N
  const network: LadderElement[] = []
  const N = cells.length
  for (let i = 0; i < N; i++) {
    if (cellType === 'T_symmetric') {
      // Left arm of cell i (merge with right arm of previous cell)
      let leftVal = cells[i].R_series
      let label = `R1 (celda ${i + 1})`
      let origin = `${i + 1}-izq`
      if (i > 0) {
        leftVal = cells[i - 1].R_series + cells[i].R_series
        label = `R1 (${i}-der) + R1 (${i + 1}-izq)`
        origin = `${i}-der + ${i + 1}-izq`
      }
      network.push({ kind: 'series', label, value: leftVal, origin })
      network.push({ kind: 'shunt', label: `R3 (celda ${i + 1})`, value: cells[i].R_shunt, origin: `${i + 1}` })
    } else {
      // π: shunt arm of cell i (merge with previous cell's right shunt)
      let leftVal = cells[i].R_shunt
      let label = `R1 (celda ${i + 1})`
      let origin = `${i + 1}-izq`
      if (i > 0) {
        const a = cells[i - 1].R_shunt
        const b = cells[i].R_shunt
        leftVal = (a * b) / (a + b)
        label = `R1 (${i}-der) ∥ R1 (${i + 1}-izq)`
        origin = `${i}-der ∥ ${i + 1}-izq`
      }
      network.push({ kind: 'shunt', label, value: leftVal, origin })
      network.push({ kind: 'series', label: `R3 (celda ${i + 1})`, value: cells[i].R_series, origin: `${i + 1}` })
    }
  }
  // Trailing arm of last cell
  if (cellType === 'T_symmetric') {
    network.push({ kind: 'series', label: `R1 (${N}-der)`, value: cells[N - 1].R_series, origin: `${N}-der` })
  } else {
    network.push({ kind: 'shunt', label: `R1 (${N}-der)`, value: cells[N - 1].R_shunt, origin: `${N}-der` })
  }

  const sumDB = dB_list.reduce((s, v) => s + v, 0)
  const cellEqs: string[] = cells.map(c => {
    if (cellType === 'T_symmetric') {
      return `Celda ${c.index} — A = ${c.dB} dB: R1 = ${c.R_series.toFixed(2)} Ω, R3 = ${isFinite(c.R_shunt) ? c.R_shunt.toFixed(2) : '∞'} Ω`
    }
    return `Celda ${c.index} — A = ${c.dB} dB: R3 (serie) = ${c.R_series.toFixed(2)} Ω, R1 (shunt) = ${isFinite(c.R_shunt) ? c.R_shunt.toFixed(2) : '∞'} Ω`
  })

  const steps: SolutionStep[] = [
    {
      title: `Atenuador en escalera — celdas tipo ${cellType === 'T_symmetric' ? 'T' : 'π'}`,
      explanation: `Z₀ = ${Z0} Ω, ${dB_list.length} celda(s) en cascada con pasos ${dB_list.join(', ')} dB (atenuación total = ${sumDB.toFixed(2)} dB).`,
      equations: [],
      result: null,
      warnings: []
    },
    {
      title: 'Diseño de celdas individuales',
      explanation: 'Cada celda se diseña como un atenuador simétrico independiente con Z₀:',
      equations: cellEqs,
      result: null,
      warnings: []
    },
    {
      title: 'Fusión de resistores compartidos',
      explanation: cellType === 'T_symmetric'
        ? 'Entre celdas adyacentes, la rama serie de salida y la rama serie de entrada se suman (están en serie sobre el mismo riel).'
        : 'Entre celdas adyacentes, la rama shunt de salida y la rama shunt de entrada quedan en paralelo (mismo nodo).',
      equations: network.map(e => `${e.kind === 'series' ? '↔ Serie' : '↕ Shunt'}  ${e.label}: ${isFinite(e.value) ? e.value.toFixed(2) : '∞'} Ω`),
      result: `Red equivalente con ${network.length} elementos.`,
      warnings: []
    }
  ]

  return { cellType, Z0, cells, network, steps, warnings: [] }
}

// ═════════════════════════════════════════════════════════════════════════════
//   Comparador de topologías — T sym, π sym, T puenteado a misma Z₀ y A
// ═════════════════════════════════════════════════════════════════════════════

export interface CompareParams {
  Z0: number
  attenuation_dB: number
  P_in?: number  // potencia de entrada en W (para calcular potencia disipada)
}

export interface CompareTopologyResult {
  topology: 'T_symmetric' | 'pi_symmetric' | 'T_bridged'
  resistors: Record<string, number>
  maxR: number
  P_dissipated: number  // potencia total disipada (W)
}

export interface CompareResult {
  Z0: number
  attenuation_dB: number
  K: number
  P_in: number
  results: CompareTopologyResult[]
  steps: SolutionStep[]
}

export async function compareTopologies(params: CompareParams): Promise<CompareResult> {
  const { Z0, attenuation_dB } = params
  const P_in = params.P_in ?? 1
  if (Z0 <= 0) throw new Error('Z₀ debe ser positivo.')
  if (attenuation_dB < 0) throw new Error('La atenuación debe ser ≥ 0 dB.')
  if (P_in <= 0) throw new Error('La potencia de entrada debe ser positiva.')

  const K = Math.pow(10, attenuation_dB / 20)
  const N = K * K
  // Total dissipated power assuming matched load: P_in - P_out = P_in (1 - 1/N)
  const P_diss = P_in * (1 - 1 / N)

  const tSym = await designAttenuator({ topology: 'T_symmetric', Z0, attenuation_dB })
  const piSym = await designAttenuator({ topology: 'pi_symmetric', Z0, attenuation_dB })
  const tBridged = await designAttenuator({ topology: 'T_bridged', Z0, attenuation_dB })

  function maxFinite(rs: Record<string, number>): number {
    let m = 0
    for (const v of Object.values(rs)) if (isFinite(v) && v > m) m = v
    return m
  }

  const results: CompareTopologyResult[] = [
    { topology: 'T_symmetric',  resistors: tSym.resistors,    maxR: maxFinite(tSym.resistors),    P_dissipated: P_diss },
    { topology: 'pi_symmetric', resistors: piSym.resistors,   maxR: maxFinite(piSym.resistors),   P_dissipated: P_diss },
    { topology: 'T_bridged',    resistors: tBridged.resistors, maxR: maxFinite(tBridged.resistors), P_dissipated: P_diss }
  ]

  const steps: SolutionStep[] = [
    {
      title: 'Comparador de topologías',
      explanation: `Para Z₀ = ${Z0} Ω y A = ${attenuation_dB} dB (K = ${K.toFixed(4)}, N = ${N.toFixed(4)}), se calculan tres topologías simétricas equivalentes y se contrasta su distribución de resistencias y disipación total.`,
      equations: [
        `Potencia de entrada P_in = ${P_in} W`,
        `Potencia disipada total: P_diss = P_in · (1 − 1/N) = ${P_in} · (1 − 1/${N.toFixed(4)}) = ${P_diss.toFixed(4)} W`,
        `(idéntica para las tres topologías porque la atenuación total es la misma)`
      ],
      result: null,
      warnings: []
    },
    {
      title: 'Resultados por topología',
      explanation: '',
      equations: results.map(r => {
        const rs = Object.entries(r.resistors).map(([k, v]) => `${k}=${isFinite(v) ? v.toFixed(2) : '∞'}Ω`).join('  ')
        return `${r.topology.padEnd(15)} → ${rs}   |   Max R = ${r.maxR.toFixed(2)} Ω`
      }),
      result: null,
      warnings: []
    }
  ]

  return { Z0, attenuation_dB, K, P_in, results, steps }
}


