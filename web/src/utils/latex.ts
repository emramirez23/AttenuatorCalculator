import type { Unit } from '../api/client'
import type { AnalysisResult, StepsDesignResult } from '../api/client'
import type { AttenuationValues, DesignResult, SolutionStep } from '../types'

// ─── Generic helpers ────────────────────────────────────────────────────────

export function downloadTeX(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/x-tex;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Escape characters that have a special meaning in LaTeX text mode. */
function escTeX(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/Ω/g, '\\,$\\Omega$')
    .replace(/∞/g, '$\\infty$')
    .replace(/α/g, '$\\alpha$')
    .replace(/β/g, '$\\beta$')
    .replace(/π/g, '$\\pi$')
    .replace(/Δ/g, '$\\Delta$')
    .replace(/·/g, '\\,\\cdot\\,')
    .replace(/×/g, '\\,\\times\\,')
    .replace(/²/g, '$^{2}$')
    .replace(/³/g, '$^{3}$')
    .replace(/√/g, '$\\sqrt{\\ }$ ')
    .replace(/≈/g, '$\\approx$')
    .replace(/≥/g, '$\\geq$')
    .replace(/≤/g, '$\\leq$')
    .replace(/±/g, '$\\pm$')
    .replace(/→/g, '$\\rightarrow$')
    .replace(/‖/g, '$\\parallel$')
    .replace(/✓/g, '\\checkmark')
    .replace(/⚠/g, '!')
    .replace(/₀/g, '$_{0}$')
    .replace(/₁/g, '$_{1}$')
    .replace(/₂/g, '$_{2}$')
    .replace(/₃/g, '$_{3}$')
    .replace(/₄/g, '$_{4}$')
    .replace(/ₘ/g, '$_{m}$')
}

function preamble(title: string): string {
  return [
    '\\documentclass[11pt,a4paper]{article}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage[spanish]{babel}',
    '\\usepackage[margin=2cm]{geometry}',
    '\\usepackage{amsmath,amssymb}',
    '\\usepackage{circuitikz}',
    '\\usepackage{siunitx}',
    '\\usepackage{xcolor}',
    '\\sisetup{output-decimal-marker={.}, group-separator={\\,}, group-minimum-digits=4}',
    '',
    '\\title{' + escTeX(title) + '}',
    '\\author{Simulador de Atenuadores --- UTN FRA}',
    '\\date{\\today}',
    '',
    '\\begin{document}',
    '\\maketitle',
    ''
  ].join('\n')
}

const footer = '\n\\end{document}\n'

function stepsBlock(steps: SolutionStep[]): string {
  const out: string[] = []
  out.push('\\section*{Resolución paso a paso}')
  for (const s of steps) {
    out.push(`\\subsection*{${escTeX(s.title)}}`)
    if (s.explanation) out.push(escTeX(s.explanation) + '\n')
    if (s.equations.length > 0) {
      out.push('\\begin{flushleft}')
      out.push('\\ttfamily')
      for (const eq of s.equations) {
        out.push(eq === '' ? '\\par\\medskip' : `${escTeX(eq)}\\par`)
      }
      out.push('\\normalfont')
      out.push('\\end{flushleft}')
    }
    if (s.result) {
      out.push(`\\noindent\\textbf{Resultado:} ${escTeX(s.result)}\\par`)
    }
    for (const w of s.warnings) {
      out.push(`\\noindent\\textcolor{red}{!\\ ${escTeX(w)}}\\par`)
    }
    out.push('')
  }
  return out.join('\n')
}

// ─── CircuiTikZ templates per topology ──────────────────────────────────────

function num(v: number): string {
  if (!isFinite(v)) return '\\infty'
  return v.toFixed(2)
}

function tikzTSym(R1: number, R3: number, Z0: number, balanced = false): string {
  if (balanced) {
    const h = (R1 / 2).toFixed(2)
    return [
      '\\begin{circuitikz}[american]',
      `  \\draw (0,0) to[short, *-] (1,0) to[R, l=$R_1/2$, a=${h}\\,\\Omega] (3,0) -- (4.5,0);`,
      `  \\draw (4.5,0) to[short] (6,0) to[R, l=$R_1/2$, a=${h}\\,\\Omega] (8,0) to[short, -*] (9,0);`,
      `  \\draw (4.5,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (4.5,-2.5);`,
      `  \\draw (0,-2.5) to[short, *-] (1,-2.5) to[R, l_=$R_1/2$, a^=${h}\\,\\Omega] (3,-2.5) -- (4.5,-2.5);`,
      `  \\draw (4.5,-2.5) to[short] (6,-2.5) to[R, l_=$R_1/2$, a^=${h}\\,\\Omega] (8,-2.5) to[short, -*] (9,-2.5);`,
      `  \\node[left]  at (0,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
      `  \\node[right] at (9,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
      '\\end{circuitikz}'
    ].join('\n')
  }
  return [
    '\\begin{circuitikz}[american]',
    `  \\draw (0,0) to[short, *-] (1,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (3,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (6,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (8,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (4.5,-2.5);`,
    '  \\draw (0,-2.5) to[short, *-*] (9,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    `  \\node[right] at (9,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzTAsym(R1: number, R2: number, R3: number, Z1: number, Z2: number, balanced = false): string {
  const r1 = balanced ? (R1 / 2).toFixed(2) : num(R1)
  const r2 = balanced ? (R2 / 2).toFixed(2) : num(R2)
  const l1 = balanced ? '$R_1/2$' : '$R_1$'
  const l2 = balanced ? '$R_2/2$' : '$R_2$'
  if (balanced) {
    return [
      '\\begin{circuitikz}[american]',
      `  \\draw (0,0) to[short, *-] (1,0) to[R, l=${l1}, a=${r1}\\,\\Omega] (3,0) -- (4.5,0);`,
      `  \\draw (4.5,0) to[short] (6,0) to[R, l=${l2}, a=${r2}\\,\\Omega] (8,0) to[short, -*] (9,0);`,
      `  \\draw (4.5,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (4.5,-2.5);`,
      `  \\draw (0,-2.5) to[short, *-] (1,-2.5) to[R, l_=${l1}, a^=${r1}\\,\\Omega] (3,-2.5) -- (4.5,-2.5);`,
      `  \\draw (4.5,-2.5) to[short] (6,-2.5) to[R, l_=${l2}, a^=${r2}\\,\\Omega] (8,-2.5) to[short, -*] (9,-2.5);`,
      `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$};`,
      `  \\node[right] at (9,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$};`,
      '\\end{circuitikz}'
    ].join('\n')
  }
  return [
    '\\begin{circuitikz}[american]',
    `  \\draw (0,0) to[short, *-] (1,0) to[R, l=${l1}, a=${r1}\\,\\Omega] (3,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (6,0) to[R, l=${l2}, a=${r2}\\,\\Omega] (8,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (4.5,-2.5);`,
    '  \\draw (0,-2.5) to[short, *-*] (9,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$};`,
    `  \\node[right] at (9,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzPiSym(R1: number, R3: number, Z0: number, balanced = false): string {
  if (balanced) {
    const h3 = (R3 / 2).toFixed(2)
    return [
      '\\begin{circuitikz}[american]',
      `  \\draw (0,0) to[short, *-] (2,0) to[R, l=$R_3/2$, a=${h3}\\,\\Omega] (6,0) to[short, -*] (8,0);`,
      `  \\draw (2,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (2,-2.5);`,
      `  \\draw (6,0) to[R, l_=$R_1$, a^=${num(R1)}\\,\\Omega] (6,-2.5);`,
      `  \\draw (0,-2.5) to[short, *-] (2,-2.5) to[R, l_=$R_3/2$, a^=${h3}\\,\\Omega] (6,-2.5) to[short, -*] (8,-2.5);`,
      `  \\node[left]  at (0,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
      `  \\node[right] at (8,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
      '\\end{circuitikz}'
    ].join('\n')
  }
  return [
    '\\begin{circuitikz}[american]',
    `  \\draw (0,0) to[short, *-] (2,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (6,0) to[short, -*] (8,0);`,
    `  \\draw (2,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (2,-2.5);`,
    `  \\draw (6,0) to[R, l_=$R_1$, a^=${num(R1)}\\,\\Omega] (6,-2.5);`,
    '  \\draw (0,-2.5) to[short, *-*] (8,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    `  \\node[right] at (8,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzPiAsym(R1: number, R2: number, R3: number, Z1: number, Z2: number, balanced = false): string {
  if (balanced) {
    const h3 = (R3 / 2).toFixed(2)
    return [
      '\\begin{circuitikz}[american]',
      `  \\draw (0,0) to[short, *-] (2,0) to[R, l=$R_3/2$, a=${h3}\\,\\Omega] (6,0) to[short, -*] (8,0);`,
      `  \\draw (2,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (2,-2.5);`,
      `  \\draw (6,0) to[R, l_=$R_2$, a^=${num(R2)}\\,\\Omega] (6,-2.5);`,
      `  \\draw (0,-2.5) to[short, *-] (2,-2.5) to[R, l_=$R_3/2$, a^=${h3}\\,\\Omega] (6,-2.5) to[short, -*] (8,-2.5);`,
      `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$};`,
      `  \\node[right] at (8,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$};`,
      '\\end{circuitikz}'
    ].join('\n')
  }
  return [
    '\\begin{circuitikz}[american]',
    `  \\draw (0,0) to[short, *-] (2,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (6,0) to[short, -*] (8,0);`,
    `  \\draw (2,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (2,-2.5);`,
    `  \\draw (6,0) to[R, l_=$R_2$, a^=${num(R2)}\\,\\Omega] (6,-2.5);`,
    '  \\draw (0,-2.5) to[short, *-*] (8,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$};`,
    `  \\node[right] at (8,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzLMin(Rs: number, Rp: number, Z1: number, Z2: number, balanced = false): string {
  if (balanced) {
    const hs = (Rs / 2).toFixed(2)
    return [
      '\\begin{circuitikz}[american]',
      `  \\draw (0,0) to[short, *-] (1,0) to[R, l=$R_s/2$, a=${hs}\\,\\Omega] (4,0) -- (5,0) to[short, -*] (7,0);`,
      `  \\draw (4,0) to[R, l=$R_p$, a=${num(Rp)}\\,\\Omega] (4,-2.5);`,
      `  \\draw (0,-2.5) to[short, *-] (1,-2.5) to[R, l_=$R_s/2$, a^=${hs}\\,\\Omega] (4,-2.5) -- (5,-2.5) to[short, -*] (7,-2.5);`,
      `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$ (alta)};`,
      `  \\node[right] at (7,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$ (baja)};`,
      '\\end{circuitikz}'
    ].join('\n')
  }
  return [
    '\\begin{circuitikz}[american]',
    `  \\draw (0,0) to[short, *-] (1,0) to[R, l=$R_s$, a=${num(Rs)}\\,\\Omega] (4,0) -- (5,0) to[short, -*] (7,0);`,
    `  \\draw (4,0) to[R, l=$R_p$, a=${num(Rp)}\\,\\Omega] (4,-2.5);`,
    '  \\draw (0,-2.5) to[short, *-*] (7,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_1$ = ${Z1}\\,$\\Omega$ (alta)};`,
    `  \\node[right] at (7,-1.25) {Z$_2$ = ${Z2}\\,$\\Omega$ (baja)};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzTBridged(R1: number, R2: number, R3: number, R4: number, Z0: number): string {
  return [
    '\\begin{circuitikz}[american]',
    '  % Main path',
    `  \\draw (0,0) to[short, *-] (1,0) to[R, l=$R_1$, a=${num(R1)}\\,\\Omega] (3,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (6,0) to[R, l=$R_2$, a=${num(R2)}\\,\\Omega] (8,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${num(R3)}\\,\\Omega] (4.5,-2.5);`,
    '  % Bridge',
    `  \\draw (1,0) -- (1,1.5) to[R, l=$R_4$, a=${num(R4)}\\,\\Omega] (8,1.5) -- (8,0);`,
    '  \\draw (0,-2.5) to[short, *-*] (9,-2.5);',
    `  \\node[left]  at (0,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    `  \\node[right] at (9,-1.25) {Z$_0$ = ${Z0}\\,$\\Omega$};`,
    '\\end{circuitikz}'
  ].join('\n')
}

function tikzForTopology(topology: string, resistors: Record<string, number>, Zin: number, Zout: number, balanced = false): string {
  const R1 = resistors['R1'] ?? 0
  const R2 = resistors['R2'] ?? 0
  const R3 = resistors['R3'] ?? 0
  const R4 = resistors['R4'] ?? 0
  const Rs = resistors['Rs'] ?? 0
  const Rp = resistors['Rp'] ?? 0
  if (topology === 'T_symmetric')  return tikzTSym(R1, R3, Zin, balanced)
  if (topology === 'T_asymmetric') return tikzTAsym(R1, R2, R3, Zin, Zout, balanced)
  if (topology === 'pi_symmetric') return tikzPiSym(R1, R3, Zin, balanced)
  if (topology === 'pi_asymmetric')return tikzPiAsym(R1, R2, R3, Zin, Zout, balanced)
  if (topology === 'L_minloss')    return tikzLMin(Rs, Rp, Zin, Zout, balanced)
  if (topology === 'T_bridged')    return tikzTBridged(R1, R2, R3, R4, Zin)
  return ''
}

// ─── Top-level builders ─────────────────────────────────────────────────────

export function buildConversionTeX(value: number, unit: Unit, att: AttenuationValues): string {
  const out: string[] = [preamble('Conversión de unidades de atenuación')]
  out.push(`\\section*{Datos de entrada}`)
  out.push(`Valor: ${value} ${unit}\\par`)
  out.push('')
  out.push('\\section*{Equivalencias}')
  out.push('\\begin{align*}')
  out.push(`K &= ${att.K.toFixed(4)} \\quad\\text{(razón de tensión)}\\\\`)
  out.push(`N &= ${att.N.toFixed(4)} \\quad\\text{(razón de potencia)}\\\\`)
  out.push(`A &= ${att.dB.toFixed(4)}\\,\\text{dB}\\\\`)
  out.push(`\\alpha &= ${att.alpha.toFixed(4)}\\,\\text{Nepers}`)
  out.push('\\end{align*}')
  out.push(footer)
  return out.join('\n')
}

export function buildDesignTeX(res: DesignResult, balanced = false): string {
  const tipo = `${res.topology}${balanced ? ' (balanceado)' : ' (desbalanceado)'}`
  const out: string[] = [preamble(`Diseño de atenuador — ${tipo}`)]
  out.push(`\\section*{Circuito}`)
  out.push(tikzForTopology(res.topology, res.resistors, res.Z_in, res.Z_out, balanced))
  out.push('')
  out.push('\\section*{Resultados}')
  out.push('\\begin{itemize}')
  for (const [n, v] of Object.entries(res.resistors)) {
    out.push(`  \\item $${n}$ = ${isFinite(v) ? v.toFixed(2) : '\\infty'}\\,$\\Omega$`)
  }
  out.push(`  \\item Z$_{in}$ = ${res.Z_in}\\,$\\Omega$,\\quad Z$_{out}$ = ${res.Z_out}\\,$\\Omega$`)
  out.push(`  \\item A = ${res.attenuation.dB.toFixed(2)}\\,dB,\\quad K = ${res.attenuation.K.toFixed(4)}`)
  out.push('\\end{itemize}')
  out.push('')
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildAnalysisTeX(res: AnalysisResult, balanced = false): string {
  const tipo = `${res.topology}${balanced ? ' (balanceado)' : ' (desbalanceado)'}`
  const out: string[] = [preamble(`Análisis de atenuador — ${tipo}`)]
  out.push(`\\section*{Circuito}`)
  out.push(tikzForTopology(res.topology, res.resistors, res.Z_in, res.Z_out, balanced))
  out.push('')
  out.push('\\section*{Resultados}')
  out.push('\\begin{itemize}')
  out.push(`  \\item Z$_{in}$ = ${res.Z_in.toFixed(2)}\\,$\\Omega$, Z$_{out}$ = ${res.Z_out.toFixed(2)}\\,$\\Omega$`)
  out.push(`  \\item A = ${res.attenuation.dB.toFixed(2)}\\,dB, K = ${res.attenuation.K.toFixed(4)}`)
  out.push('\\end{itemize}')
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildStepsTeX(res: StepsDesignResult): string {
  const out: string[] = [preamble(`Atenuador por pasos — ${res.topology}`)]
  out.push(`Topología: ${escTeX(res.topology)}\\par`)
  out.push('')
  for (const c of res.cells) {
    out.push(`\\section*{Paso A = ${c.dB}\\,dB \\quad (K = ${c.K.toFixed(4)})}`)
    out.push(tikzForTopology(c.topology, c.resistors, c.Z_in, c.Z_out, false))
    out.push('')
    out.push('\\begin{itemize}')
    for (const [n, v] of Object.entries(c.resistors)) {
      out.push(`  \\item $${n}$ = ${isFinite(v) ? v.toFixed(2) : '\\infty'}\\,$\\Omega$`)
    }
    out.push('\\end{itemize}')
    out.push('')
  }
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}
