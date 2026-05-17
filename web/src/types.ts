export interface SolutionStep {
  title: string
  explanation: string
  equations: string[]
  result: string | null
  warnings: string[]
}

export interface AttenuationValues {
  K: number
  N: number
  dB: number
  alpha: number
}

export interface DesignResult {
  topology: string
  resistors: Record<string, number>
  Z_in: number
  Z_out: number
  attenuation: AttenuationValues
  steps: SolutionStep[]
  warnings: string[]
}

export interface ConvertResponse {
  attenuation: AttenuationValues
  steps: SolutionStep[]
}
