import type { ConvertResponse, DesignResult } from '../types'

const BASE = 'http://localhost:8000'

export type Unit = 'dB' | 'K' | 'neper'
export type Topology = 'T_symmetric' | 'pi_symmetric' | 'T_asymmetric' | 'pi_asymmetric' | 'T_bridged' | 'L_minloss'

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body.detail ?? `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}

export async function convertAttenuation(value: number, unit: Unit): Promise<ConvertResponse> {
  const res = await fetch(`${BASE}/api/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, unit }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export interface DesignParams {
  topology: Topology
  Z0?: number
  Z1?: number
  Z2?: number
  attenuation_dB?: number
}

export async function designAttenuator(params: DesignParams): Promise<DesignResult> {
  const res = await fetch(`${BASE}/api/design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
