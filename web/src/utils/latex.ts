import type { Unit } from '../api/client'
import type { AnalysisResult, StepsDesignResult, LadderDesignResult, CompareResult } from '../api/client'
import type { AttenuationValues, DesignResult, SolutionStep } from '../types'

// ─── Generic helpers ────────────────────────────────────────────────────────

export function downloadTeX(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/x-tex;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadPDF(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Compile a LaTeX source to PDF via latex.ytotech.com (sync API, CORS enabled).
 * Throws on error with the server's response body.
 */
export async function compileToPDF(tex: string): Promise<Blob> {
  const response = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'pdflatex',
      resources: [{ main: true, content: tex }]
    })
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('pdf')) {
    let detail = ''
    try {
      if (contentType.includes('json')) {
        const j = await response.json()
        detail = JSON.stringify(j).slice(0, 1200)
      } else {
        detail = (await response.text()).slice(0, 1200)
      }
    } catch { /* ignore */ }
    throw new Error(`No se pudo compilar el LaTeX (HTTP ${response.status}). ${detail}`)
  }
  return await response.blob()
}

// ─── Text & equation sanitisation ───────────────────────────────────────────
// Plain-text escaping for the body of the document (titles, explanations…).
// We deliberately translate common Unicode operators into ASCII so pdflatex
// doesn't need extra packages (newunicodechar, etc.).

const unicodeAscii: Array<[string | RegExp, string]> = [
  [/Ω/g, '$\\Omega$'],
  [/α/g, '$\\alpha$'],
  [/β/g, '$\\beta$'],
  [/π/g, '$\\pi$'],
  [/γ/g, '$\\gamma$'],
  [/Δ/g, '$\\Delta$'],
  [/φ/g, '$\\varphi$'],
  [/θ/g, '$\\theta$'],
  [/²/g, '$^{2}$'],
  [/³/g, '$^{3}$'],
  [/₀/g, '$_{0}$'],
  [/₁/g, '$_{1}$'],
  [/₂/g, '$_{2}$'],
  [/₃/g, '$_{3}$'],
  [/₄/g, '$_{4}$'],
  [/ₘ/g, '$_{m}$'],
  [/·/g, '$\\cdot$'],
  [/×/g, '$\\times$'],
  [/√/g, '$\\surd$'],
  [/≈/g, '$\\approx$'],
  [/≥/g, '$\\geq$'],
  [/≤/g, '$\\leq$'],
  [/±/g, '$\\pm$'],
  [/→/g, '$\\rightarrow$'],
  [/‖/g, '$\\parallel$'],
  [/∞/g, '$\\infty$'],
  [/✓/g, '\\checkmark'],
  [/⚠/g, '$\\triangleright$'],
  [/−/g, '-'],   // Unicode minus → ASCII
  [/—/g, '---'],  // Em dash
  [/–/g, '--']    // En dash
]

function escText(s: string): string {
  // LaTeX special chars first (order matters: backslash first!)
  let out = s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%#_])/g, '\\$1')
    .replace(/\$/g, '\\$')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
  for (const [from, to] of unicodeAscii) {
    out = out.replace(from as RegExp, to)
  }
  return out
}

// Equations are printed inside a verbatim environment, so all characters
// are taken literally (no LaTeX parsing, no babel active-character issues).
// We only translate Unicode operators into ASCII fall-backs so the default
// monospace font can render them.
function eqBlock(equations: string[]): string {
  if (equations.length === 0) return ''
  const lines: string[] = ['\\begin{verbatim}']
  for (const eq of equations) {
    if (eq === '') { lines.push(''); continue }
    lines.push(toAscii(eq))
  }
  lines.push('\\end{verbatim}')
  return lines.join('\n')
}

function toAscii(s: string): string {
  return s
    .replace(/Ω/g, 'Ohm')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/π/g, 'pi')
    .replace(/γ/g, 'gamma')
    .replace(/Δ/g, 'Delta')
    .replace(/θ/g, 'theta')
    .replace(/φ/g, 'phi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/₀/g, '_0')
    .replace(/₁/g, '_1')
    .replace(/₂/g, '_2')
    .replace(/₃/g, '_3')
    .replace(/₄/g, '_4')
    .replace(/ₘ/g, '_m')
    .replace(/·/g, '*')
    .replace(/×/g, '*')
    .replace(/√/g, 'sqrt')
    .replace(/≈/g, '~=')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/±/g, '+/-')
    .replace(/→/g, '->')
    .replace(/‖/g, '||')
    .replace(/∥/g, '||')
    .replace(/∞/g, 'inf')
    .replace(/−/g, '-')
    .replace(/✓/g, 'OK')
    .replace(/⚠/g, '!')
    // Accented vowels → ASCII (verbatim can't handle UTF-8 accents)
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I')
    .replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ñ/g, 'N')
    // Dashes
    .replace(/—/g, '--').replace(/–/g, '-')
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
    '\\usepackage{booktabs}',
    '',
    '\\title{' + escText(title) + '}',
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
    out.push(`\\subsection*{${escText(s.title)}}`)
    if (s.explanation) {
      out.push(escText(s.explanation))
      out.push('')
    }
    if (s.equations.length > 0) {
      out.push(eqBlock(s.equations))
    }
    if (s.result) {
      out.push(`\\noindent\\textbf{Resultado:} ${escText(s.result)}\\par`)
    }
    for (const w of s.warnings) {
      out.push(`\\noindent\\textbf{Advertencia:} ${escText(w)}\\par`)
    }
    out.push('')
  }
  return out.join('\n')
}

// ─── CircuiTikZ templates per topology ──────────────────────────────────────
// All coordinates are in tikz default units (~1cm). The drawing fits A4
// (page width ~17cm after 2cm margins) by keeping the horizontal span ≤ 10.

function fmt(v: number): string {
  if (!isFinite(v)) return '\\infty'
  // Clean up near-integer values (e.g. 599.9995 → 600)
  const r = Math.round(v)
  if (Math.abs(v - r) < 0.05) return String(r)
  return v.toFixed(2)
}

function ann(value: number): string {
  // Annotation string for circuitikz "a=" key, math-mode wrapped.
  return `{$${fmt(value)}\\,\\Omega$}`
}

function annHalf(value: number): string {
  return `{$${fmt(value / 2)}\\,\\Omega$}`
}

function tikzTSym(R1: number, R3: number, Z0: number, balanced = false): string {
  if (balanced) {
    return [
      '\\begin{center}',
      '\\begin{circuitikz}[american,scale=0.95]',
      `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=$R_1/2$, a=${annHalf(R1)}] (3.5,0) -- (4.5,0);`,
      `  \\draw (4.5,0) to[short] (5.5,0) to[R, l=$R_1/2$, a=${annHalf(R1)}] (8.5,0) to[short, -*] (9,0);`,
      `  \\draw (4.5,0) to[R, l=$R_3$, a=${ann(R3)}] (4.5,-2.6);`,
      `  \\draw (0,-2.6) to[short, *-] (0.5,-2.6) to[R, l=$R_1/2$, a=${annHalf(R1)}] (3.5,-2.6) -- (4.5,-2.6);`,
      `  \\draw (4.5,-2.6) to[short] (5.5,-2.6) to[R, l=$R_1/2$, a=${annHalf(R1)}] (8.5,-2.6) to[short, -*] (9,-2.6);`,
      `  \\node[left]  at (-0.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
      `  \\node[right] at (9.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
      '\\end{circuitikz}',
      '\\end{center}'
    ].join('\n')
  }
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=$R_1$, a=${ann(R1)}] (3.5,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (5.5,0) to[R, l=$R_1$, a=${ann(R1)}] (8.5,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${ann(R3)}] (4.5,-2.6);`,
    '  \\draw (0,-2.6) to[short, *-*] (9,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    `  \\node[right] at (9.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzTAsym(R1: number, R2: number, R3: number, Z1: number, Z2: number, balanced = false): string {
  const l1 = balanced ? '$R_1/2$' : '$R_1$'
  const l2 = balanced ? '$R_2/2$' : '$R_2$'
  const a1 = balanced ? annHalf(R1) : ann(R1)
  const a2 = balanced ? annHalf(R2) : ann(R2)
  if (balanced) {
    return [
      '\\begin{center}',
      '\\begin{circuitikz}[american,scale=0.95]',
      `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=${l1}, a=${a1}] (3.5,0) -- (4.5,0);`,
      `  \\draw (4.5,0) to[short] (5.5,0) to[R, l=${l2}, a=${a2}] (8.5,0) to[short, -*] (9,0);`,
      `  \\draw (4.5,0) to[R, l=$R_3$, a=${ann(R3)}] (4.5,-2.6);`,
      `  \\draw (0,-2.6) to[short, *-] (0.5,-2.6) to[R, l=${l1}, a=${a1}] (3.5,-2.6) -- (4.5,-2.6);`,
      `  \\draw (4.5,-2.6) to[short] (5.5,-2.6) to[R, l=${l2}, a=${a2}] (8.5,-2.6) to[short, -*] (9,-2.6);`,
      `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$};`,
      `  \\node[right] at (9.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$};`,
      '\\end{circuitikz}',
      '\\end{center}'
    ].join('\n')
  }
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=$R_1$, a=${ann(R1)}] (3.5,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (5.5,0) to[R, l=$R_2$, a=${ann(R2)}] (8.5,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${ann(R3)}] (4.5,-2.6);`,
    '  \\draw (0,-2.6) to[short, *-*] (9,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$};`,
    `  \\node[right] at (9.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzPiSym(R1: number, R3: number, Z0: number, balanced = false): string {
  const l3 = balanced ? '$R_3/2$' : '$R_3$'
  const a3 = balanced ? annHalf(R3) : ann(R3)
  if (balanced) {
    return [
      '\\begin{center}',
      '\\begin{circuitikz}[american,scale=0.95]',
      `  \\draw (0,0) to[short, *-] (1.5,0) to[R, l=${l3}, a=${a3}] (6.5,0) to[short, -*] (8,0);`,
      `  \\draw (1.5,0) to[R, l=$R_1$, a=${ann(R1)}] (1.5,-2.6);`,
      `  \\draw (6.5,0) to[R, l=$R_1$, a=${ann(R1)}] (6.5,-2.6);`,
      `  \\draw (0,-2.6) to[short, *-] (1.5,-2.6) to[R, l=${l3}, a=${a3}] (6.5,-2.6) to[short, -*] (8,-2.6);`,
      `  \\node[left]  at (-0.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
      `  \\node[right] at (8.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
      '\\end{circuitikz}',
      '\\end{center}'
    ].join('\n')
  }
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (1.5,0) to[R, l=$R_3$, a=${ann(R3)}] (6.5,0) to[short, -*] (8,0);`,
    `  \\draw (1.5,0) to[R, l=$R_1$, a=${ann(R1)}] (1.5,-2.6);`,
    `  \\draw (6.5,0) to[R, l=$R_1$, a=${ann(R1)}] (6.5,-2.6);`,
    '  \\draw (0,-2.6) to[short, *-*] (8,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    `  \\node[right] at (8.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzPiAsym(R1: number, R2: number, R3: number, Z1: number, Z2: number, balanced = false): string {
  const l3 = balanced ? '$R_3/2$' : '$R_3$'
  const a3 = balanced ? annHalf(R3) : ann(R3)
  if (balanced) {
    return [
      '\\begin{center}',
      '\\begin{circuitikz}[american,scale=0.95]',
      `  \\draw (0,0) to[short, *-] (1.5,0) to[R, l=${l3}, a=${a3}] (6.5,0) to[short, -*] (8,0);`,
      `  \\draw (1.5,0) to[R, l=$R_1$, a=${ann(R1)}] (1.5,-2.6);`,
      `  \\draw (6.5,0) to[R, l=$R_2$, a=${ann(R2)}] (6.5,-2.6);`,
      `  \\draw (0,-2.6) to[short, *-] (1.5,-2.6) to[R, l=${l3}, a=${a3}] (6.5,-2.6) to[short, -*] (8,-2.6);`,
      `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$};`,
      `  \\node[right] at (8.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$};`,
      '\\end{circuitikz}',
      '\\end{center}'
    ].join('\n')
  }
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (1.5,0) to[R, l=$R_3$, a=${ann(R3)}] (6.5,0) to[short, -*] (8,0);`,
    `  \\draw (1.5,0) to[R, l=$R_1$, a=${ann(R1)}] (1.5,-2.6);`,
    `  \\draw (6.5,0) to[R, l=$R_2$, a=${ann(R2)}] (6.5,-2.6);`,
    '  \\draw (0,-2.6) to[short, *-*] (8,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$};`,
    `  \\node[right] at (8.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzLMin(Rs: number, Rp: number, Z1: number, Z2: number, balanced = false): string {
  const ls = balanced ? '$R_s/2$' : '$R_s$'
  const as_ = balanced ? annHalf(Rs) : ann(Rs)
  if (balanced) {
    return [
      '\\begin{center}',
      '\\begin{circuitikz}[american,scale=0.95]',
      `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=${ls}, a=${as_}] (3.5,0) -- (4.5,0) to[short, -*] (7,0);`,
      `  \\draw (4.5,0) to[R, l=$R_p$, a=${ann(Rp)}] (4.5,-2.6);`,
      `  \\draw (0,-2.6) to[short, *-] (0.5,-2.6) to[R, l=${ls}, a=${as_}] (3.5,-2.6) -- (4.5,-2.6) to[short, -*] (7,-2.6);`,
      `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$ (alta)};`,
      `  \\node[right] at (7.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$ (baja)};`,
      '\\end{circuitikz}',
      '\\end{center}'
    ].join('\n')
  }
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=$R_s$, a=${ann(Rs)}] (3.5,0) -- (4.5,0) to[short, -*] (7,0);`,
    `  \\draw (4.5,0) to[R, l=$R_p$, a=${ann(Rp)}] (4.5,-2.6);`,
    '  \\draw (0,-2.6) to[short, *-*] (7,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_1 = ${roundZ(Z1)}\\,\\Omega$ (alta)};`,
    `  \\node[right] at (7.1,-1.3) {$Z_2 = ${roundZ(Z2)}\\,\\Omega$ (baja)};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzTBridged(R1: number, R2: number, R3: number, R4: number, Z0: number): string {
  return [
    '\\begin{center}',
    '\\begin{circuitikz}[american,scale=0.95]',
    `  \\draw (0,0) to[short, *-] (0.5,0) to[R, l=$R_1$, a=${ann(R1)}] (3.5,0) -- (4.5,0);`,
    `  \\draw (4.5,0) to[short] (5.5,0) to[R, l=$R_2$, a=${ann(R2)}] (8.5,0) to[short, -*] (9,0);`,
    `  \\draw (4.5,0) to[R, l=$R_3$, a=${ann(R3)}] (4.5,-2.6);`,
    `  \\draw (0.5,0) -- (0.5,1.6) to[R, l=$R_4$, a=${ann(R4)}] (8.5,1.6) -- (8.5,0);`,
    '  \\draw (0,-2.6) to[short, *-*] (9,-2.6);',
    `  \\node[left]  at (-0.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    `  \\node[right] at (9.1,-1.3) {$Z_0 = ${roundZ(Z0)}\\,\\Omega$};`,
    '\\end{circuitikz}',
    '\\end{center}'
  ].join('\n')
}

function tikzForTopology(topology: string, resistors: Record<string, number>, Zin: number, Zout: number, balanced = false): string {
  const R1 = resistors['R1'] ?? 0
  const R2 = resistors['R2'] ?? 0
  const R3 = resistors['R3'] ?? 0
  const R4 = resistors['R4'] ?? 0
  const Rs = resistors['Rs'] ?? 0
  const Rp = resistors['Rp'] ?? 0
  if (topology === 'T_symmetric')   return tikzTSym(R1, R3, Zin, balanced)
  if (topology === 'T_asymmetric')  return tikzTAsym(R1, R2, R3, Zin, Zout, balanced)
  if (topology === 'pi_symmetric')  return tikzPiSym(R1, R3, Zin, balanced)
  if (topology === 'pi_asymmetric') return tikzPiAsym(R1, R2, R3, Zin, Zout, balanced)
  if (topology === 'L_minloss')     return tikzLMin(Rs, Rp, Zin, Zout, balanced)
  if (topology === 'T_bridged')     return tikzTBridged(R1, R2, R3, R4, Zin)
  return ''
}

function resistorListLatex(resistors: Record<string, number>): string {
  const out: string[] = ['\\begin{itemize}']
  for (const [n, v] of Object.entries(resistors)) {
    out.push(`  \\item $${n.replace(/(\d+)$/, '_{$1}').replace(/([sp])$/, '_$1')}$ = $${fmt(v)}$\\,$\\Omega$`)
  }
  out.push('\\end{itemize}')
  return out.join('\n')
}

const PRETTY_TOPOLOGY: Record<string, string> = {
  T_symmetric: 'T simétrico',
  T_asymmetric: 'T asimétrico',
  pi_symmetric: 'π simétrico',
  pi_asymmetric: 'π asimétrico',
  T_bridged: 'T puenteado (bridged)',
  L_minloss: 'Adaptador L (pérdida mínima)'
}

function roundZ(v: number): string {
  if (!isFinite(v)) return '\\infty'
  const r = Math.round(v)
  if (Math.abs(v - r) < 0.05) return String(r)
  return v.toFixed(1)
}

// ─── Top-level builders ─────────────────────────────────────────────────────

export function buildConversionTeX(value: number, unit: Unit, att: AttenuationValues): string {
  const out: string[] = [preamble('Conversión de unidades de atenuación')]
  out.push('\\section*{Datos de entrada}')
  out.push(`\\noindent Valor ingresado: $${value}$\\,${unit === 'dB' ? '\\text{dB}' : unit === 'neper' ? '\\text{Nepers}' : ''} ${unit === 'K' ? '(K)' : ''}\\par`)
  out.push('')
  out.push('\\section*{Equivalencias calculadas}')
  out.push('\\begin{align*}')
  out.push(`K &= ${att.K.toFixed(4)} \\quad\\text{(razón de tensión)}\\\\`)
  out.push(`N &= ${att.N.toFixed(4)} \\quad\\text{(razón de potencia)}\\\\`)
  out.push(`A &= ${att.dB.toFixed(4)}\\;\\text{dB}\\\\`)
  out.push(`\\alpha &= ${att.alpha.toFixed(4)}\\;\\text{Nepers}`)
  out.push('\\end{align*}')
  out.push('')
  out.push('\\section*{Fórmulas usadas}')
  out.push('\\begin{align*}')
  out.push('K &= 10^{A/20} \\\\')
  out.push('N &= 10^{A/10} = K^{2} \\\\')
  out.push('\\alpha &= \\ln K \\\\')
  out.push('A_{\\text{dB}} &= 8{,}686 \\,\\alpha')
  out.push('\\end{align*}')
  out.push(footer)
  return out.join('\n')
}

export function buildDesignTeX(res: DesignResult, balanced = false): string {
  const tipo = PRETTY_TOPOLOGY[res.topology] ?? res.topology
  const variant = balanced ? 'balanceado' : 'desbalanceado'
  const out: string[] = [preamble(`Diseño de atenuador --- ${tipo} (${variant})`)]
  out.push('\\section*{Circuito resultante}')
  out.push(tikzForTopology(res.topology, res.resistors, res.Z_in, res.Z_out, balanced))
  out.push('')
  out.push('\\section*{Valores de resistencias y parámetros}')
  out.push(resistorListLatex(res.resistors))
  out.push('\\smallskip')
  out.push(`\\noindent $Z_{\\text{in}} = ${roundZ(res.Z_in)}\\,\\Omega$\\quad $Z_{\\text{out}} = ${roundZ(res.Z_out)}\\,\\Omega$\\quad $A = ${res.attenuation.dB.toFixed(2)}$\\,dB \\quad $K = ${res.attenuation.K.toFixed(4)}$\\par`)
  out.push('')
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildAnalysisTeX(res: AnalysisResult, balanced = false): string {
  const tipo = PRETTY_TOPOLOGY[res.topology] ?? res.topology
  const variant = balanced ? 'balanceado' : 'desbalanceado'
  const out: string[] = [preamble(`Análisis de atenuador --- ${tipo} (${variant})`)]
  out.push('\\section*{Circuito analizado}')
  out.push(tikzForTopology(res.topology, res.resistors, res.Z_in, res.Z_out, balanced))
  out.push('')
  out.push('\\section*{Resultados}')
  out.push(resistorListLatex(res.resistors))
  out.push('\\smallskip')
  out.push(`\\noindent $Z_{\\text{in}} = ${roundZ(res.Z_in)}\\,\\Omega$\\quad $Z_{\\text{out}} = ${roundZ(res.Z_out)}\\,\\Omega$\\quad $A = ${res.attenuation.dB.toFixed(2)}$\\,dB \\quad $K = ${res.attenuation.K.toFixed(4)}$\\par`)
  out.push('')
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildStepsTeX(res: StepsDesignResult): string {
  const tipo = PRETTY_TOPOLOGY[res.topology] ?? res.topology
  const out: string[] = [preamble(`Atenuador por pasos --- ${tipo}`)]
  for (const c of res.cells) {
    out.push(`\\section*{Paso $A = ${c.dB}$\\,dB \\hspace{0.3em} ($K = ${c.K.toFixed(4)}$)}`)
    out.push(tikzForTopology(c.topology, c.resistors, c.Z_in, c.Z_out, false))
    out.push(resistorListLatex(c.resistors))
    out.push('')
  }
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildLadderTeX(res: LadderDesignResult): string {
  const tipo = res.cellType === 'T_symmetric' ? 'celdas T' : 'celdas $\\pi$'
  const out: string[] = [preamble(`Atenuador en escalera --- ${tipo}`)]
  out.push('\\section*{Datos}')
  out.push(`\\noindent $Z_0 = ${roundZ(res.Z0)}\\,\\Omega$ --- ${res.cells.length} celda(s) en cascada\\par`)
  out.push('')
  out.push('\\section*{Celdas individuales}')
  out.push('\\begin{center}\\begin{tabular}{cccc}')
  out.push('\\toprule')
  out.push('Celda & $A$ (dB) & $R_{\\text{serie}}$ ($\\Omega$) & $R_{\\text{shunt}}$ ($\\Omega$)\\\\')
  out.push('\\midrule')
  for (const c of res.cells) {
    out.push(`${c.index} & ${c.dB} & ${fmt(c.R_series)} & ${fmt(c.R_shunt)}\\\\`)
  }
  out.push('\\bottomrule')
  out.push('\\end{tabular}\\end{center}')
  out.push('')
  out.push('\\section*{Red equivalente fusionada}')
  out.push('\\begin{center}\\begin{tabular}{lll}')
  out.push('\\toprule')
  out.push('Tipo & Origen & Valor ($\\Omega$)\\\\')
  out.push('\\midrule')
  for (const e of res.network) {
    const label = e.label.replace(/∥/g, '\\,$\\parallel$\\,')
    out.push(`${e.kind === 'series' ? 'Serie' : 'Shunt'} & ${escText(label)} & ${fmt(e.value)}\\\\`)
  }
  out.push('\\bottomrule')
  out.push('\\end{tabular}\\end{center}')
  out.push('')
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}

export function buildCompareTeX(res: CompareResult): string {
  const out: string[] = [preamble('Comparador de topologías')]
  out.push('\\section*{Datos}')
  out.push(`\\noindent $Z_0 = ${roundZ(res.Z0)}\\,\\Omega$\\quad $A = ${res.attenuation_dB}$\\,dB\\quad $K = ${res.K.toFixed(4)}$\\quad $P_{\\text{in}} = ${res.P_in}$\\,W\\par`)
  out.push('')
  for (const r of res.results) {
    out.push(`\\section*{${escText(PRETTY_TOPOLOGY[r.topology] ?? r.topology)}}`)
    out.push(tikzForTopology(r.topology, r.resistors, res.Z0, res.Z0, false))
    out.push(resistorListLatex(r.resistors))
    out.push(`\\noindent\\textbf{Max R:} $${r.maxR.toFixed(2)}\\,\\Omega$\\quad \\textbf{P disipada total:} $${r.P_dissipated.toFixed(4)}$\\,W\\par`)
    out.push('')
  }
  out.push(stepsBlock(res.steps))
  out.push(footer)
  return out.join('\n')
}
