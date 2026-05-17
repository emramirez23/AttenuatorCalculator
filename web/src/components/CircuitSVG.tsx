interface CircuitSVGProps {
  topology: string
  resistors: Record<string, number>
  Z_in: number
  Z_out: number
}

const wire: React.CSSProperties = { stroke: 'var(--svg-ink)', strokeWidth: 1.8, fill: 'none' }
const box: React.CSSProperties = { fill: 'var(--field-bg)', stroke: 'var(--svg-ink)', strokeWidth: 1.5 }
const rLabel: React.CSSProperties = { fill: 'var(--accent-2)', fontSize: 11, fontWeight: 700, fontFamily: 'Cascadia Mono, Consolas, monospace' }
const rValue: React.CSSProperties = { fill: 'var(--svg-muted)', fontSize: 10, fontFamily: 'Cascadia Mono, Consolas, monospace' }
const portStyle: React.CSSProperties = { fill: 'var(--schematic-bg)', stroke: 'var(--accent)', strokeWidth: 1.8 }
const portLabel: React.CSSProperties = { fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }
const nodeDot: React.CSSProperties = { fill: 'var(--svg-ink)' }

function fmt(v: number) {
  if (!isFinite(v)) return '∞ Ω'
  return `${v.toFixed(2)} Ω`
}

function Ground({ cx, y }: { cx: number; y: number }) {
  return (
    <g>
      <line x1={cx} y1={y} x2={cx} y2={y + 6} style={wire} />
      <line x1={cx - 13} y1={y + 6} x2={cx + 13} y2={y + 6} style={wire} />
      <line x1={cx - 8} y1={y + 11} x2={cx + 8} y2={y + 11} style={wire} />
      <line x1={cx - 4} y1={y + 16} x2={cx + 4} y2={y + 16} style={wire} />
    </g>
  )
}

function ResistorH({ x, y, w = 90, h = 36, label, value }: {
  x: number; y: number; w?: number; h?: number; label: string; value: number
}) {
  const cx = x + w / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} style={box} />
      <text x={cx} y={y - 6} textAnchor="middle" style={rLabel}>{label}</text>
      <text x={cx} y={y + h + 14} textAnchor="middle" style={rValue}>{fmt(value)}</text>
    </g>
  )
}

function ResistorV({ x, y, w = 36, h = 58, label, value, labelRight = true }: {
  x: number; y: number; w?: number; h?: number; label: string; value: number; labelRight?: boolean
}) {
  const cy = y + h / 2
  const lx = labelRight ? x + w + 8 : x - 8
  const anchor = labelRight ? 'start' : 'end'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} style={box} />
      <text x={lx} y={cy - 7} textAnchor={anchor} style={rLabel}>{label}</text>
      <text x={lx} y={cy + 8} textAnchor={anchor} style={rValue}>{fmt(value)}</text>
    </g>
  )
}

// ── T simétrico ───────────────────────────────────────────────────────────────

function TCircuit({ R1, R3, Z_in, Z_out }: { R1: number; R3: number; Z_in: number; Z_out: number }) {
  const ry = 82
  const bH = 36; const bW = 90
  const bY = ry - bH / 2
  const p1 = 18; const p2 = 422
  const r1in = 60; const node = 200; const r1out = 240
  const r3x = node - 18; const r3y = ry + 10; const r3h = 58; const r3w = 36

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 22} textAnchor="middle" style={portLabel}>Z₀={Z_in}Ω</text>
      <text x={p2} y={ry - 22} textAnchor="middle" style={portLabel}>Z₀={Z_out}Ω</text>
      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>
      <line x1={p1 + 5} y1={ry} x2={r1in} y2={ry} style={wire} />
      <ResistorH x={r1in} y={bY} w={bW} h={bH} label="R1" value={R1} />
      <line x1={r1in + bW} y1={ry} x2={node} y2={ry} style={wire} />
      <circle cx={node} cy={ry} r={4} style={nodeDot} />
      <line x1={node} y1={ry} x2={node} y2={r3y} style={wire} />
      <ResistorV x={r3x} y={r3y} w={r3w} h={r3h} label="R3" value={R3} labelRight />
      <line x1={node} y1={r3y + r3h} x2={node} y2={r3y + r3h + 6} style={wire} />
      <Ground cx={node} y={r3y + r3h + 6} />
      <line x1={node} y1={ry} x2={r1out} y2={ry} style={wire} />
      <ResistorH x={r1out} y={bY} w={bW} h={bH} label="R1" value={R1} />
      <line x1={r1out + bW} y1={ry} x2={p2 - 5} y2={ry} style={wire} />
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
    </svg>
  )
}

// ── T asimétrico ──────────────────────────────────────────────────────────────

function TAsymmetricCircuit({ R1, R2, R3, Z_in, Z_out }: {
  R1: number; R2: number; R3: number; Z_in: number; Z_out: number
}) {
  const ry = 82
  const bH = 36; const bW = 90
  const bY = ry - bH / 2
  const p1 = 18; const p2 = 422
  const r1in = 55; const node = 200; const r2out = 240
  const r3x = node - 18; const r3y = ry + 10; const r3h = 58; const r3w = 36

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 22} textAnchor="middle" style={portLabel}>Z₁={Z_in}Ω</text>
      <text x={p2} y={ry - 22} textAnchor="middle" style={portLabel}>Z₂={Z_out}Ω</text>
      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>
      <line x1={p1 + 5} y1={ry} x2={r1in} y2={ry} style={wire} />
      <ResistorH x={r1in} y={bY} w={bW} h={bH} label="R1" value={R1} />
      <line x1={r1in + bW} y1={ry} x2={node} y2={ry} style={wire} />
      <circle cx={node} cy={ry} r={4} style={nodeDot} />
      <line x1={node} y1={ry} x2={node} y2={r3y} style={wire} />
      <ResistorV x={r3x} y={r3y} w={r3w} h={r3h} label="R3" value={R3} labelRight />
      <line x1={node} y1={r3y + r3h} x2={node} y2={r3y + r3h + 6} style={wire} />
      <Ground cx={node} y={r3y + r3h + 6} />
      <line x1={node} y1={ry} x2={r2out} y2={ry} style={wire} />
      <ResistorH x={r2out} y={bY} w={bW} h={bH} label="R2" value={R2} />
      <line x1={r2out + bW} y1={ry} x2={p2 - 5} y2={ry} style={wire} />
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
    </svg>
  )
}

// ── π simétrico ───────────────────────────────────────────────────────────────

function PiCircuit({ R3, R1, Z_in, Z_out }: { R3: number; R1: number; Z_in: number; Z_out: number }) {
  const ry = 72
  const bH = 36; const bW = 120
  const p1 = 18; const j1 = 80; const r3x = 140; const j2 = r3x + bW + 60; const p2 = 420
  const sw = 36; const sh = 62; const sy = ry + 10

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 22} textAnchor="middle" style={portLabel}>Z₀={Z_in}Ω</text>
      <text x={p2} y={ry - 22} textAnchor="middle" style={portLabel}>Z₀={Z_out}Ω</text>
      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>
      <line x1={p1 + 5} y1={ry} x2={j1} y2={ry} style={wire} />
      <circle cx={j1} cy={ry} r={4} style={nodeDot} />
      <line x1={j1} y1={ry} x2={j1} y2={sy} style={wire} />
      <ResistorV x={j1 - sw / 2} y={sy} w={sw} h={sh} label="R1" value={R1} labelRight={false} />
      <line x1={j1} y1={sy + sh} x2={j1} y2={sy + sh + 6} style={wire} />
      <Ground cx={j1} y={sy + sh + 6} />
      <line x1={j1} y1={ry} x2={r3x} y2={ry} style={wire} />
      <ResistorH x={r3x} y={ry - bH / 2} w={bW} h={bH} label="R3" value={R3} />
      <line x1={r3x + bW} y1={ry} x2={j2} y2={ry} style={wire} />
      <circle cx={j2} cy={ry} r={4} style={nodeDot} />
      <line x1={j2} y1={ry} x2={j2} y2={sy} style={wire} />
      <ResistorV x={j2 - sw / 2} y={sy} w={sw} h={sh} label="R1" value={R1} labelRight />
      <line x1={j2} y1={sy + sh} x2={j2} y2={sy + sh + 6} style={wire} />
      <Ground cx={j2} y={sy + sh + 6} />
      <line x1={j2} y1={ry} x2={p2 - 5} y2={ry} style={wire} />
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
    </svg>
  )
}

// ── π asimétrico ──────────────────────────────────────────────────────────────

function PiAsymmetricCircuit({ R3, R1, R2, Z_in, Z_out }: {
  R3: number; R1: number; R2: number; Z_in: number; Z_out: number
}) {
  const ry = 72
  const bH = 36; const bW = 120
  const p1 = 18; const j1 = 80; const r3x = 140; const j2 = r3x + bW + 60; const p2 = 420
  const sw = 36; const sh = 62; const sy = ry + 10

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 22} textAnchor="middle" style={portLabel}>Z₁={Z_in}Ω</text>
      <text x={p2} y={ry - 22} textAnchor="middle" style={portLabel}>Z₂={Z_out}Ω</text>
      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>
      <line x1={p1 + 5} y1={ry} x2={j1} y2={ry} style={wire} />
      <circle cx={j1} cy={ry} r={4} style={nodeDot} />
      <line x1={j1} y1={ry} x2={j1} y2={sy} style={wire} />
      <ResistorV x={j1 - sw / 2} y={sy} w={sw} h={sh} label="R1" value={R1} labelRight={false} />
      <line x1={j1} y1={sy + sh} x2={j1} y2={sy + sh + 6} style={wire} />
      <Ground cx={j1} y={sy + sh + 6} />
      <line x1={j1} y1={ry} x2={r3x} y2={ry} style={wire} />
      <ResistorH x={r3x} y={ry - bH / 2} w={bW} h={bH} label="R3" value={R3} />
      <line x1={r3x + bW} y1={ry} x2={j2} y2={ry} style={wire} />
      <circle cx={j2} cy={ry} r={4} style={nodeDot} />
      <line x1={j2} y1={ry} x2={j2} y2={sy} style={wire} />
      <ResistorV x={j2 - sw / 2} y={sy} w={sw} h={sh} label="R2" value={R2} labelRight />
      <line x1={j2} y1={sy + sh} x2={j2} y2={sy + sh + 6} style={wire} />
      <Ground cx={j2} y={sy + sh + 6} />
      <line x1={j2} y1={ry} x2={p2 - 5} y2={ry} style={wire} />
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
    </svg>
  )
}

// ── T Bridged (Puenteado) ──────────────────────────────────────────────────────

function TBridgedCircuit({ R1, R2, R3, R4, Z_in, Z_out }: {
  R1: number; R2: number; R3: number; R4: number; Z_in: number; Z_out: number
}) {
  const ry = 85
  const bH = 36; const bW = 80
  const bY = ry - bH / 2
  const p1 = 18; const p2 = 422
  const r1x = 55; const nodeA = 165; const r3x = 200; const nodeB = 305; const r2x = 240
  const r4w = 36; const r4h = 58
  const r4x = nodeA - r4w / 2; const r4y = ry + 10

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 28} textAnchor="middle" style={portLabel}>Z₀={Z_in}Ω</text>
      <text x={p2} y={ry - 28} textAnchor="middle" style={portLabel}>Z₀={Z_out}Ω</text>

      {/* Input port */}
      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>

      {/* R1 (series at input) */}
      <line x1={p1 + 5} y1={ry} x2={r1x} y2={ry} style={wire} />
      <ResistorH x={r1x} y={bY} w={bW} h={bH} label="R1" value={R1} />
      <line x1={r1x + bW} y1={ry} x2={nodeA} y2={ry} style={wire} />

      {/* Node A (junction) */}
      <circle cx={nodeA} cy={ry} r={4} style={nodeDot} />

      {/* R4 (shunt to ground) */}
      <line x1={nodeA} y1={ry} x2={nodeA} y2={r4y} style={wire} />
      <ResistorV x={r4x} y={r4y} w={r4w} h={r4h} label="R4" value={R4} labelRight={false} />
      <line x1={nodeA} y1={r4y + r4h} x2={nodeA} y2={r4y + r4h + 6} style={wire} />
      <Ground cx={nodeA} y={r4y + r4h + 6} />

      {/* R3 (bridge resistor) */}
      <line x1={nodeA} y1={ry} x2={nodeB} y2={ry} style={wire} />
      <ResistorH x={r3x} y={bY - 10} w={70} h={28} label="R3" value={R3} />

      {/* Node B (junction) */}
      <circle cx={nodeB} cy={ry} r={4} style={nodeDot} />

      {/* R2 (series at output) */}
      <line x1={nodeB} y1={ry} x2={r2x} y2={ry} style={wire} />
      <ResistorH x={r2x} y={bY} w={bW} h={bH} label="R2" value={R2} />
      <line x1={r2x + bW} y1={ry} x2={p2 - 5} y2={ry} style={wire} />

      {/* Output port */}
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
    </svg>
  )
}

// ── Adaptador L ───────────────────────────────────────────────────────────────

function LCircuit({ Rs, Rp, Z_in, Z_out }: { Rs: number; Rp: number; Z_in: number; Z_out: number }) {
  const ry = 80
  const bH = 36; const bW = 140
  const p1 = 18; const p2 = 422
  const rsX = 55; const node = rsX + bW + 10  // node at x=205
  const rpW = 36; const rpH = 62
  const rpX = node - rpW / 2; const rpY = ry + 10

  return (
    <svg viewBox="0 0 440 185" xmlns="http://www.w3.org/2000/svg">
      <text x={p1} y={ry - 28} textAnchor="middle" style={portLabel}>Z₁={Z_in}Ω</text>
      <text x={p2} y={ry - 28} textAnchor="middle" style={portLabel}>Z₂={Z_out}Ω</text>
      <text x={p1} y={ry - 14} textAnchor="middle" style={{ ...portLabel, fill: 'var(--accent)', fontSize: 10 }}>(alta)</text>
      <text x={p2} y={ry - 14} textAnchor="middle" style={{ ...portLabel, fill: 'var(--accent)', fontSize: 10 }}>(baja)</text>

      <circle cx={p1} cy={ry} r={4.5} style={portStyle} />
      <text x={p1} y={ry + 18} textAnchor="middle" style={portLabel}>1</text>
      <line x1={p1 + 5} y1={ry} x2={rsX} y2={ry} style={wire} />

      <ResistorH x={rsX} y={ry - bH / 2} w={bW} h={bH} label="Rs" value={Rs} />
      <line x1={rsX + bW} y1={ry} x2={node} y2={ry} style={wire} />

      <circle cx={node} cy={ry} r={4} style={nodeDot} />
      <line x1={node} y1={ry} x2={node} y2={rpY} style={wire} />
      <ResistorV x={rpX} y={rpY} w={rpW} h={rpH} label="Rp" value={Rp} labelRight />
      <line x1={node} y1={rpY + rpH} x2={node} y2={rpY + rpH + 6} style={wire} />
      <Ground cx={node} y={rpY + rpH + 6} />

      <line x1={node} y1={ry} x2={p2 - 5} y2={ry} style={wire} />
      <circle cx={p2} cy={ry} r={4.5} style={portStyle} />
      <text x={p2} y={ry + 18} textAnchor="middle" style={portLabel}>2</text>
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
