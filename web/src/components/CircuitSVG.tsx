interface CircuitSVGProps {
  topology: string
  resistors: Record<string, number>
  Z_in: number
  Z_out: number
}

const wire: React.CSSProperties = { stroke: 'var(--svg-ink)', strokeWidth: 1.8, fill: 'none' }
const box: React.CSSProperties = { fill: 'var(--field-bg)', stroke: 'var(--svg-ink)', strokeWidth: 1.5 }
const rName: React.CSSProperties = { fill: 'var(--accent-2)', fontSize: 10, fontWeight: 700, fontFamily: 'Cascadia Mono, Consolas, monospace' }
const rVal: React.CSSProperties = { fill: 'var(--svg-muted)', fontSize: 8, fontFamily: 'Cascadia Mono, Consolas, monospace' }
const portStyle: React.CSSProperties = { fill: 'var(--schematic-bg)', stroke: 'var(--accent)', strokeWidth: 1.8 }
const zLabel: React.CSSProperties = { fill: 'var(--muted)', fontSize: 11, fontWeight: 700, fontFamily: 'Cascadia Mono, Consolas, monospace' }
const nodeDot: React.CSSProperties = { fill: 'var(--svg-ink)' }

// Shared resistor dimensions
const RW = 68   // horizontal width
const RH = 30   // horizontal height
const RVW = 26  // vertical width
const RVH = 46  // vertical height

// Standard rail positions (all non-bridged)
const RY = 72    // top rail y
const BY = 148   // bottom rail y  → gap 76 = RVH 46 + 2×15 wire
const P1 = 28    // left port x
const P2 = 432   // right port x

function fmt(v: number) {
  if (!isFinite(v)) return '∞ Ω'
  return `${v.toFixed(2)} Ω`
}

/** Horizontal resistor: name + value both INSIDE the box. */
function ResistorH({ x, y, w = RW, h = RH, label, value }: {
  x: number; y: number; w?: number; h?: number; label: string; value: number
}) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} style={box} />
      <text x={cx} y={y + 11} textAnchor="middle" style={rName}>{label}</text>
      <text x={cx} y={y + 23} textAnchor="middle" style={rVal}>{fmt(value)}</text>
    </g>
  )
}

/** Vertical resistor: name INSIDE box, value to the side. */
function ResistorV({ x, y, w = RVW, h = RVH, label, value, labelRight = true }: {
  x: number; y: number; w?: number; h?: number; label: string; value: number; labelRight?: boolean
}) {
  const cx = x + w / 2
  const mid = y + h / 2 + 3
  const vx = labelRight ? x + w + 5 : x - 5
  const anchor = labelRight ? 'start' : 'end'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} style={box} />
      <text x={cx} y={mid} textAnchor="middle" style={{ ...rName, fontSize: 9 }}>{label}</text>
      <text x={vx} y={mid} textAnchor={anchor} style={rVal}>{fmt(value)}</text>
    </g>
  )
}

/** Two port circles + number label between them. */
function Port({ x, ry, by, num, side }: {
  x: number; ry: number; by: number; num: string; side: 'left' | 'right'
}) {
  const mid = (ry + by) / 2
  const lx = side === 'left' ? x - 8 : x + 8
  const anchor = side === 'left' ? 'end' : 'start'
  return (
    <g>
      <circle cx={x} cy={ry} r={4.5} style={portStyle} />
      <circle cx={x} cy={by} r={4.5} style={portStyle} />
      <text x={lx} y={mid + 4} textAnchor={anchor} style={{ ...zLabel, fontSize: 12 }}>{num}</text>
    </g>
  )
}

/** Shunt branch: wire → ResistorV → wire → bottom rail dot. */
function Shunt({ cx, ry, by, label, value, labelRight = true }: {
  cx: number; ry: number; by: number; label: string; value: number; labelRight?: boolean
}) {
  const vgap = Math.round((by - ry - RVH) / 2)
  const rx = cx - RVW / 2
  const vy = ry + vgap
  return (
    <g>
      <line x1={cx} y1={ry} x2={cx} y2={vy} style={wire} />
      <ResistorV x={rx} y={vy} label={label} value={value} labelRight={labelRight} />
      <line x1={cx} y1={vy + RVH} x2={cx} y2={by} style={wire} />
      <circle cx={cx} cy={by} r={3} style={nodeDot} />
    </g>
  )
}

// ── T simétrico ───────────────────────────────────────────────────────────────
function TCircuit({ R1, R3, Z_in, Z_out }: { R1: number; R3: number; Z_in: number; Z_out: number }) {
  const jx = 230
  const r1Lx = jx - 16 - RW   // 146
  const r1Rx = jx + 16         // 246

  return (
    <svg viewBox="0 0 460 164" xmlns="http://www.w3.org/2000/svg">
      <text x={P1 + 8} y={RY - 22} textAnchor="start" style={zLabel}>Z₀={Z_in}Ω</text>
      <text x={P2 - 8} y={RY - 22} textAnchor="end" style={zLabel}>Z₀={Z_out}Ω</text>

      <line x1={P1} y1={RY} x2={r1Lx} y2={RY} style={wire} />
      <ResistorH x={r1Lx} y={RY - RH / 2} label="R1" value={R1} />
      <line x1={r1Lx + RW} y1={RY} x2={jx} y2={RY} style={wire} />
      <circle cx={jx} cy={RY} r={3.5} style={nodeDot} />
      <line x1={jx} y1={RY} x2={r1Rx} y2={RY} style={wire} />
      <ResistorH x={r1Rx} y={RY - RH / 2} label="R1" value={R1} />
      <line x1={r1Rx + RW} y1={RY} x2={P2} y2={RY} style={wire} />

      <Shunt cx={jx} ry={RY} by={BY} label="R3" value={R3} labelRight={false} />

      <line x1={P1} y1={BY} x2={P2} y2={BY} style={wire} />
      <Port x={P1} ry={RY} by={BY} num="1" side="left" />
      <Port x={P2} ry={RY} by={BY} num="2" side="right" />
    </svg>
  )
}

// ── T asimétrico ──────────────────────────────────────────────────────────────
function TAsymmetricCircuit({ R1, R2, R3, Z_in, Z_out }: {
  R1: number; R2: number; R3: number; Z_in: number; Z_out: number
}) {
  const jx = 230
  const r1x = jx - 16 - RW   // 146
  const r2x = jx + 16         // 246

  return (
    <svg viewBox="0 0 460 164" xmlns="http://www.w3.org/2000/svg">
      <text x={P1 + 8} y={RY - 22} textAnchor="start" style={zLabel}>Z₁={Z_in}Ω</text>
      <text x={P2 - 8} y={RY - 22} textAnchor="end" style={zLabel}>Z₂={Z_out}Ω</text>

      <line x1={P1} y1={RY} x2={r1x} y2={RY} style={wire} />
      <ResistorH x={r1x} y={RY - RH / 2} label="R1" value={R1} />
      <line x1={r1x + RW} y1={RY} x2={jx} y2={RY} style={wire} />
      <circle cx={jx} cy={RY} r={3.5} style={nodeDot} />
      <line x1={jx} y1={RY} x2={r2x} y2={RY} style={wire} />
      <ResistorH x={r2x} y={RY - RH / 2} label="R2" value={R2} />
      <line x1={r2x + RW} y1={RY} x2={P2} y2={RY} style={wire} />

      <Shunt cx={jx} ry={RY} by={BY} label="R3" value={R3} labelRight={false} />

      <line x1={P1} y1={BY} x2={P2} y2={BY} style={wire} />
      <Port x={P1} ry={RY} by={BY} num="1" side="left" />
      <Port x={P2} ry={RY} by={BY} num="2" side="right" />
    </svg>
  )
}

// ── π simétrico ───────────────────────────────────────────────────────────────
function PiCircuit({ R3, R1, Z_in, Z_out }: { R3: number; R1: number; Z_in: number; Z_out: number }) {
  const j1 = 110, j2 = 350
  const r3x = Math.round((j1 + j2) / 2 - RW / 2)  // 196

  return (
    <svg viewBox="0 0 460 164" xmlns="http://www.w3.org/2000/svg">
      <text x={P1 + 8} y={RY - 22} textAnchor="start" style={zLabel}>Z₀={Z_in}Ω</text>
      <text x={P2 - 8} y={RY - 22} textAnchor="end" style={zLabel}>Z₀={Z_out}Ω</text>

      <line x1={P1} y1={RY} x2={j1} y2={RY} style={wire} />
      <circle cx={j1} cy={RY} r={3.5} style={nodeDot} />
      <line x1={j1} y1={RY} x2={r3x} y2={RY} style={wire} />
      <ResistorH x={r3x} y={RY - RH / 2} label="R3" value={R3} />
      <line x1={r3x + RW} y1={RY} x2={j2} y2={RY} style={wire} />
      <circle cx={j2} cy={RY} r={3.5} style={nodeDot} />
      <line x1={j2} y1={RY} x2={P2} y2={RY} style={wire} />

      <Shunt cx={j1} ry={RY} by={BY} label="R1" value={R1} labelRight />
      <Shunt cx={j2} ry={RY} by={BY} label="R1" value={R1} labelRight={false} />

      <line x1={P1} y1={BY} x2={P2} y2={BY} style={wire} />
      <Port x={P1} ry={RY} by={BY} num="1" side="left" />
      <Port x={P2} ry={RY} by={BY} num="2" side="right" />
    </svg>
  )
}

// ── π asimétrico ──────────────────────────────────────────────────────────────
function PiAsymmetricCircuit({ R3, R1, R2, Z_in, Z_out }: {
  R3: number; R1: number; R2: number; Z_in: number; Z_out: number
}) {
  const j1 = 110, j2 = 350
  const r3x = Math.round((j1 + j2) / 2 - RW / 2)  // 196

  return (
    <svg viewBox="0 0 460 164" xmlns="http://www.w3.org/2000/svg">
      <text x={P1 + 8} y={RY - 22} textAnchor="start" style={zLabel}>Z₁={Z_in}Ω</text>
      <text x={P2 - 8} y={RY - 22} textAnchor="end" style={zLabel}>Z₂={Z_out}Ω</text>

      <line x1={P1} y1={RY} x2={j1} y2={RY} style={wire} />
      <circle cx={j1} cy={RY} r={3.5} style={nodeDot} />
      <line x1={j1} y1={RY} x2={r3x} y2={RY} style={wire} />
      <ResistorH x={r3x} y={RY - RH / 2} label="R3" value={R3} />
      <line x1={r3x + RW} y1={RY} x2={j2} y2={RY} style={wire} />
      <circle cx={j2} cy={RY} r={3.5} style={nodeDot} />
      <line x1={j2} y1={RY} x2={P2} y2={RY} style={wire} />

      <Shunt cx={j1} ry={RY} by={BY} label="R1" value={R1} labelRight />
      <Shunt cx={j2} ry={RY} by={BY} label="R2" value={R2} labelRight={false} />

      <line x1={P1} y1={BY} x2={P2} y2={BY} style={wire} />
      <Port x={P1} ry={RY} by={BY} num="1" side="left" />
      <Port x={P2} ry={RY} by={BY} num="2" side="right" />
    </svg>
  )
}

// ── Adaptador L (pérdida mínima) ──────────────────────────────────────────────
function LCircuit({ Rs, Rp, Z_in, Z_out }: { Rs: number; Rp: number; Z_in: number; Z_out: number }) {
  const rsX = 110
  const jx = rsX + RW + 18   // 196

  return (
    <svg viewBox="0 0 460 164" xmlns="http://www.w3.org/2000/svg">
      <text x={P1 + 8} y={RY - 22} textAnchor="start" style={zLabel}>Z₁={Z_in}Ω</text>
      <text x={P2 - 8} y={RY - 22} textAnchor="end" style={zLabel}>Z₂={Z_out}Ω</text>
      <text x={P1 + 8} y={RY - 9} textAnchor="start" style={{ ...zLabel, fill: 'var(--accent)', fontSize: 9 }}>(alta)</text>
      <text x={P2 - 8} y={RY - 9} textAnchor="end" style={{ ...zLabel, fill: 'var(--accent)', fontSize: 9 }}>(baja)</text>

      <line x1={P1} y1={RY} x2={rsX} y2={RY} style={wire} />
      <ResistorH x={rsX} y={RY - RH / 2} label="Rs" value={Rs} />
      <line x1={rsX + RW} y1={RY} x2={jx} y2={RY} style={wire} />
      <circle cx={jx} cy={RY} r={3.5} style={nodeDot} />
      <line x1={jx} y1={RY} x2={P2} y2={RY} style={wire} />

      <Shunt cx={jx} ry={RY} by={BY} label="Rp" value={Rp} labelRight />

      <line x1={P1} y1={BY} x2={P2} y2={BY} style={wire} />
      <Port x={P1} ry={RY} by={BY} num="1" side="left" />
      <Port x={P2} ry={RY} by={BY} num="2" side="right" />
    </svg>
  )
}

// ── T Puenteado (Bridged) ─────────────────────────────────────────────────────
//  j1 ──────────[R4 bridge]────────── j2    (above)
//  │                                   │
//  p1 ─── j1 ─[R1]─ center ─[R2]─ j2 ─── p2
//                     │
//                    [R3]
//                     │
//                  bottom rail
function TBridgedCircuit({ R1, R2, R3, R4, Z_in, Z_out }: {
  R1: number; R2: number; R3: number; R4: number; Z_in: number; Z_out: number
}) {
  const bRY = 110    // main top rail
  const bBY = 184    // bottom rail
  const bP1 = 28, bP2 = 472
  const bridgeCY = 38  // vertical center of R4 box

  const j1 = 110, j2 = 390
  const bCenter = Math.round((j1 + j2) / 2)  // 250
  const r1x = bCenter - 20 - RW   // 162
  const r2x = bCenter + 20         // 270
  const r4x = bCenter - RW / 2     // 216

  return (
    <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
      <text x={bP1 + 8} y={bRY - 24} textAnchor="start" style={zLabel}>Z₀={Z_in}Ω</text>
      <text x={bP2 - 8} y={bRY - 24} textAnchor="end" style={zLabel}>Z₀={Z_out}Ω</text>

      {/* R4 bridge */}
      <line x1={j1} y1={bRY} x2={j1} y2={bridgeCY} style={wire} />
      <line x1={j1} y1={bridgeCY} x2={r4x} y2={bridgeCY} style={wire} />
      <ResistorH x={r4x} y={bridgeCY - RH / 2} label="R4" value={R4} />
      <line x1={r4x + RW} y1={bridgeCY} x2={j2} y2={bridgeCY} style={wire} />
      <line x1={j2} y1={bridgeCY} x2={j2} y2={bRY} style={wire} />

      {/* Main path */}
      <line x1={bP1} y1={bRY} x2={j1} y2={bRY} style={wire} />
      <circle cx={j1} cy={bRY} r={3.5} style={nodeDot} />
      <line x1={j1} y1={bRY} x2={r1x} y2={bRY} style={wire} />
      <ResistorH x={r1x} y={bRY - RH / 2} label="R1" value={R1} />
      <line x1={r1x + RW} y1={bRY} x2={bCenter} y2={bRY} style={wire} />
      <circle cx={bCenter} cy={bRY} r={3.5} style={nodeDot} />
      <line x1={bCenter} y1={bRY} x2={r2x} y2={bRY} style={wire} />
      <ResistorH x={r2x} y={bRY - RH / 2} label="R2" value={R2} />
      <line x1={r2x + RW} y1={bRY} x2={j2} y2={bRY} style={wire} />
      <circle cx={j2} cy={bRY} r={3.5} style={nodeDot} />
      <line x1={j2} y1={bRY} x2={bP2} y2={bRY} style={wire} />

      {/* R3 shunt */}
      <Shunt cx={bCenter} ry={bRY} by={bBY} label="R3" value={R3} labelRight />

      <line x1={bP1} y1={bBY} x2={bP2} y2={bBY} style={wire} />
      <Port x={bP1} ry={bRY} by={bBY} num="1" side="left" />
      <Port x={bP2} ry={bRY} by={bBY} num="2" side="right" />
    </svg>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export function CircuitSVG({ topology, resistors, Z_in, Z_out }: CircuitSVGProps) {
  if (topology === 'T_symmetric') {
    return <TCircuit R1={resistors['R1'] ?? 0} R3={resistors['R3'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
  }
  if (topology === 'T_asymmetric') {
    return <TAsymmetricCircuit R1={resistors['R1'] ?? 0} R2={resistors['R2'] ?? 0} R3={resistors['R3'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
  }
  if (topology === 'pi_asymmetric') {
    return <PiAsymmetricCircuit R3={resistors['R3'] ?? 0} R1={resistors['R1'] ?? 0} R2={resistors['R2'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
  }
  if (topology === 'T_bridged') {
    return <TBridgedCircuit R1={resistors['R1'] ?? 0} R2={resistors['R2'] ?? 0} R3={resistors['R3'] ?? 0} R4={resistors['R4'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
  }
  if (topology === 'L_minloss') {
    return <LCircuit Rs={resistors['Rs'] ?? 0} Rp={resistors['Rp'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
  }
  return <PiCircuit R3={resistors['R3'] ?? 0} R1={resistors['R1'] ?? 0} Z_in={Z_in} Z_out={Z_out} />
}
