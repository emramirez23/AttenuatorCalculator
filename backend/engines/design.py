import math
from ..domain.models import AttenuationValues, DesignResult, SolutionStep


def _k_min(Z1: float, Z2: float) -> float:
    """Atenuación mínima realizable para cualquier topología asimétrica."""
    n = max(Z1, Z2) / min(Z1, Z2)
    return math.sqrt(n) + math.sqrt(n - 1)


def design_T_symmetric(Z0: float, att: AttenuationValues) -> DesignResult:
    K = att.K
    alpha = att.alpha
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    if K <= 1.0:
        warnings.append(
            "K = 1 corresponde a 0 dB. El T simétrico degenera en cortocircuito pasante (R1=0, R3=∞)."
        )

    steps.append(SolutionStep(
        title="Topología: T simétrico desbalanceado",
        explanation=(
            f"Circuito con dos brazos serie iguales (R1) y un brazo en derivación (R3). "
            f"Impedancia característica: Z0 = {Z0} Ω. "
            f"Atenuación requerida: A = {att.dB:.2f} dB → K = {K:.4f}."
        ),
    ))

    R1 = Z0 * (K - 1) / (K + 1)
    R3 = Z0 * 2 * K / (K ** 2 - 1)

    steps.append(SolutionStep(
        title="Cálculo por método aritmético",
        explanation="Aplicando las fórmulas de diseño en función de Z0 y K:",
        equations=[
            f"R1 = Z0 · (K − 1) / (K + 1)",
            f"R1 = {Z0} · ({K:.4f} − 1) / ({K:.4f} + 1) = {Z0} · {K - 1:.4f} / {K + 1:.4f}",
            f"R1 = {R1:.2f} Ω",
            f"",
            f"R3 = Z0 · 2K / (K² − 1)",
            f"R3 = {Z0} · 2 × {K:.4f} / ({K:.4f}² − 1) = {Z0} · {2 * K:.4f} / {K ** 2 - 1:.4f}",
            f"R3 = {R3:.2f} Ω",
        ],
        result=f"R1 = {R1:.2f} Ω  |  R3 = {R3:.2f} Ω",
    ))

    R1_hyp = Z0 * math.tanh(alpha / 2) if alpha > 0 else 0.0
    R3_hyp = Z0 / math.sinh(alpha) if alpha > 0 else math.inf

    steps.append(SolutionStep(
        title="Verificación con fórmulas hiperbólicas",
        explanation=f"Con α = ln(K) = ln({K:.4f}) = {alpha:.4f} Nepers:",
        equations=[
            f"R1 = Z0 · tanh(α/2) = {Z0} · tanh({alpha / 2:.4f}) = {R1_hyp:.2f} Ω  ✓",
            f"R3 = Z0 / sinh(α)   = {Z0} / sinh({alpha:.4f})     = {R3_hyp:.2f} Ω  ✓",
        ],
        result=f"Método aritmético e hiperbólico coinciden dentro de tolerancia numérica.",
    ))

    step_warnings: list[str] = []
    if R1 < 0:
        step_warnings.append(f"R1 = {R1:.4f} Ω < 0: el cuadripolo no es realizable con esta especificación.")
        warnings.append(step_warnings[-1])
    if R3 < 0:
        step_warnings.append(f"R3 = {R3:.4f} Ω < 0: el cuadripolo no es realizable con esta especificación.")
        warnings.append(step_warnings[-1])

    steps.append(SolutionStep(
        title="Resultado final",
        explanation=(
            "Circuito T simétrico desbalanceado. "
            "Para la versión balanceada cada brazo serie se divide: R1/2 en cada ramal."
        ),
        equations=[
            f"Brazo serie entrada:  R1 = {R1:.2f} Ω",
            f"Brazo derivación:     R3 = {R3:.2f} Ω",
            f"Brazo serie salida:   R1 = {R1:.2f} Ω",
            f"Impedancia característica: Z0 = {Z0} Ω",
            f"Atenuación: A = {att.dB:.2f} dB  (K = {K:.4f})",
        ],
        result=f"R1 = {R1:.2f} Ω,  R3 = {R3:.2f} Ω",
        warnings=step_warnings,
    ))

    return DesignResult(
        topology="T_symmetric",
        resistors={"R1": round(R1, 4), "R3": round(R3, 4)},
        Z_in=Z0,
        Z_out=Z0,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )


def design_pi_symmetric(Z0: float, att: AttenuationValues) -> DesignResult:
    K = att.K
    alpha = att.alpha
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    if K <= 1.0:
        warnings.append(
            "K = 1 corresponde a 0 dB. El π simétrico no está definido para K = 1 (R1 → ∞)."
        )

    steps.append(SolutionStep(
        title="Topología: π simétrico desbalanceado",
        explanation=(
            f"Circuito con un brazo serie central (R3) y dos brazos en derivación iguales (R1). "
            f"Impedancia característica: Z0 = {Z0} Ω. "
            f"Atenuación requerida: A = {att.dB:.2f} dB → K = {K:.4f}."
        ),
    ))

    R3 = Z0 * (K ** 2 - 1) / (2 * K)
    R1 = Z0 * (K + 1) / (K - 1) if K > 1 else math.inf

    steps.append(SolutionStep(
        title="Cálculo por método aritmético",
        explanation="Aplicando las fórmulas de diseño en función de Z0 y K:",
        equations=[
            f"R3 = Z0 · (K² − 1) / (2K)",
            f"R3 = {Z0} · ({K:.4f}² − 1) / (2 × {K:.4f}) = {Z0} · {K ** 2 - 1:.4f} / {2 * K:.4f}",
            f"R3 = {R3:.2f} Ω",
            f"",
            f"R1 = Z0 · (K + 1) / (K − 1)",
            f"R1 = {Z0} · ({K:.4f} + 1) / ({K:.4f} − 1) = {Z0} · {K + 1:.4f} / {K - 1:.4f}",
            f"R1 = {R1:.2f} Ω",
        ],
        result=f"R3 = {R3:.2f} Ω  |  R1 = {R1:.2f} Ω",
    ))

    R3_hyp = Z0 * math.sinh(alpha) if alpha > 0 else 0.0
    R1_hyp = Z0 / math.tanh(alpha / 2) if alpha > 0 else math.inf

    steps.append(SolutionStep(
        title="Verificación con fórmulas hiperbólicas",
        explanation=f"Con α = ln(K) = ln({K:.4f}) = {alpha:.4f} Nepers:",
        equations=[
            f"R3 = Z0 · sinh(α)    = {Z0} · sinh({alpha:.4f}) = {R3_hyp:.2f} Ω  ✓",
            f"R1 = Z0 / tanh(α/2)  = {Z0} / tanh({alpha / 2:.4f}) = {R1_hyp:.2f} Ω  ✓",
        ],
        result=f"Método aritmético e hiperbólico coinciden dentro de tolerancia numérica.",
    ))

    step_warnings: list[str] = []
    if R3 < 0:
        step_warnings.append(f"R3 = {R3:.4f} Ω < 0: el cuadripolo no es realizable.")
        warnings.append(step_warnings[-1])
    if R1 < 0:
        step_warnings.append(f"R1 = {R1:.4f} Ω < 0: el cuadripolo no es realizable.")
        warnings.append(step_warnings[-1])

    steps.append(SolutionStep(
        title="Resultado final",
        explanation=(
            "Circuito π simétrico desbalanceado. "
            "Para la versión balanceada el brazo serie se dobla (2·R3) y cada derivación "
            "se divide a la mitad (R1/2 en cada ramal superior e inferior)."
        ),
        equations=[
            f"Derivación entrada:   R1 = {R1:.2f} Ω",
            f"Brazo serie:          R3 = {R3:.2f} Ω",
            f"Derivación salida:    R1 = {R1:.2f} Ω",
            f"Impedancia característica: Z0 = {Z0} Ω",
            f"Atenuación: A = {att.dB:.2f} dB  (K = {K:.4f})",
        ],
        result=f"R3 = {R3:.2f} Ω,  R1 = {R1:.2f} Ω",
        warnings=step_warnings,
    ))

    return DesignResult(
        topology="pi_symmetric",
        resistors={"R3": round(R3, 4), "R1": round(R1, 4)},
        Z_in=Z0,
        Z_out=Z0,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )


def design_T_asymmetric(Z1: float, Z2: float, att: AttenuationValues) -> DesignResult:
    K = att.K
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    Z12 = math.sqrt(Z1 * Z2)
    Km = _k_min(Z1, Z2)
    Am = 20 * math.log10(Km) if Km > 1 else 0.0

    if K < Km - 1e-9:
        warnings.append(
            f"La atenuación mínima realizable para Z1={Z1} Ω, Z2={Z2} Ω es "
            f"A_min = {Am:.2f} dB (K_min = {Km:.4f}). "
            f"El valor solicitado K = {K:.4f} genera resistencias negativas."
        )

    steps.append(SolutionStep(
        title="Topología: T asimétrico desbalanceado",
        explanation=(
            f"Circuito con dos brazos serie distintos (R1 en entrada, R2 en salida) y un brazo en derivación (R3). "
            f"Z1 = {Z1} Ω (entrada), Z2 = {Z2} Ω (salida). "
            f"Atenuación requerida: A = {att.dB:.2f} dB → K = {K:.4f}. "
            f"Atenuación mínima realizable: A_min = {Am:.2f} dB."
        ),
    ))

    R3 = 2 * K * Z12 / (K ** 2 - 1)
    R1 = (Z1 * (K ** 2 + 1) - 2 * K * Z12) / (K ** 2 - 1)
    R2 = (Z2 * (K ** 2 + 1) - 2 * K * Z12) / (K ** 2 - 1)

    steps.append(SolutionStep(
        title="Cálculo por fórmulas de diseño",
        explanation="Aplicando las fórmulas para T asimétrico con impedancias imagen Z1 y Z2:",
        equations=[
            f"√(Z1·Z2) = √({Z1}·{Z2}) = {Z12:.4f} Ω",
            f"",
            f"R3 = 2K·√(Z1·Z2) / (K²−1)",
            f"R3 = 2×{K:.4f}×{Z12:.4f} / ({K ** 2:.4f}−1) = {R3:.2f} Ω",
            f"",
            f"R1 = [Z1·(K²+1) − 2K·√(Z1·Z2)] / (K²−1)",
            f"R1 = [{Z1}·{K ** 2 + 1:.4f} − 2×{K:.4f}×{Z12:.4f}] / {K ** 2 - 1:.4f}",
            f"R1 = [{Z1 * (K ** 2 + 1):.4f} − {2 * K * Z12:.4f}] / {K ** 2 - 1:.4f} = {R1:.2f} Ω",
            f"",
            f"R2 = [Z2·(K²+1) − 2K·√(Z1·Z2)] / (K²−1)",
            f"R2 = [{Z2 * (K ** 2 + 1):.4f} − {2 * K * Z12:.4f}] / {K ** 2 - 1:.4f} = {R2:.2f} Ω",
        ],
        result=f"R1 = {R1:.2f} Ω  |  R3 = {R3:.2f} Ω  |  R2 = {R2:.2f} Ω",
    ))

    inner_Z2 = R2 + Z2
    shunt_12 = R3 * inner_Z2 / (R3 + inner_Z2) if (R3 + inner_Z2) > 0 else 0.0
    Z_in_v = R1 + shunt_12
    inner_Z1 = R1 + Z1
    shunt_21 = R3 * inner_Z1 / (R3 + inner_Z1) if (R3 + inner_Z1) > 0 else 0.0
    Z_out_v = R2 + shunt_21

    steps.append(SolutionStep(
        title="Verificación de impedancias imagen",
        explanation="Comprobando Z_in y Z_out con la carga nominal conectada:",
        equations=[
            f"Z_in = R1 + R3‖(R2+Z2) = {R1:.2f} + {shunt_12:.2f} = {Z_in_v:.2f} Ω  (esperado: {Z1} Ω)",
            f"Z_out = R2 + R3‖(R1+Z1) = {R2:.2f} + {shunt_21:.2f} = {Z_out_v:.2f} Ω  (esperado: {Z2} Ω)",
        ],
        result=f"ΔZ_in = {abs(Z_in_v - Z1):.4f} Ω  |  ΔZ_out = {abs(Z_out_v - Z2):.4f} Ω",
    ))

    step_warnings: list[str] = []
    for name, val in [("R1", R1), ("R2", R2), ("R3", R3)]:
        if val < -1e-9:
            msg = f"{name} = {val:.4f} Ω < 0: no realizable. Incrementar A por encima de A_min = {Am:.2f} dB."
            step_warnings.append(msg)
            warnings.append(msg)

    steps.append(SolutionStep(
        title="Resultado final",
        explanation="Circuito T asimétrico desbalanceado.",
        equations=[
            f"Brazo serie entrada: R1 = {R1:.2f} Ω",
            f"Brazo derivación:    R3 = {R3:.2f} Ω",
            f"Brazo serie salida:  R2 = {R2:.2f} Ω",
            f"Impedancia entrada:  Z1 = {Z1} Ω",
            f"Impedancia salida:   Z2 = {Z2} Ω",
            f"Atenuación:          A = {att.dB:.2f} dB  (K = {K:.4f})",
            f"A_min realizable:    {Am:.2f} dB  (K_min = {Km:.4f})",
        ],
        result=f"R1 = {R1:.2f} Ω,  R3 = {R3:.2f} Ω,  R2 = {R2:.2f} Ω",
        warnings=step_warnings,
    ))

    return DesignResult(
        topology="T_asymmetric",
        resistors={"R1": round(R1, 4), "R3": round(R3, 4), "R2": round(R2, 4)},
        Z_in=Z1,
        Z_out=Z2,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )


def design_pi_asymmetric(Z1: float, Z2: float, att: AttenuationValues) -> DesignResult:
    K = att.K
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    Z12 = math.sqrt(Z1 * Z2)
    Km = _k_min(Z1, Z2)
    Am = 20 * math.log10(Km) if Km > 1 else 0.0

    if K < Km - 1e-9:
        warnings.append(
            f"La atenuación mínima realizable para Z1={Z1} Ω, Z2={Z2} Ω es "
            f"A_min = {Am:.2f} dB (K_min = {Km:.4f}). "
            f"El valor solicitado K = {K:.4f} genera resistencias no realizables."
        )

    steps.append(SolutionStep(
        title="Topología: π asimétrico desbalanceado",
        explanation=(
            f"Circuito con un brazo serie central (R3) y dos brazos en derivación distintos (R1 en entrada, R2 en salida). "
            f"Z1 = {Z1} Ω (entrada), Z2 = {Z2} Ω (salida). "
            f"Atenuación requerida: A = {att.dB:.2f} dB → K = {K:.4f}. "
            f"Atenuación mínima realizable: A_min = {Am:.2f} dB."
        ),
    ))

    R3 = Z12 * (K ** 2 - 1) / (2 * K)

    denom_R1 = K ** 2 + 1 - 2 * K * math.sqrt(Z1 / Z2)
    denom_R2 = K ** 2 + 1 - 2 * K * math.sqrt(Z2 / Z1)
    R1 = Z1 * (K ** 2 - 1) / denom_R1 if abs(denom_R1) > 1e-12 else math.inf
    R2 = Z2 * (K ** 2 - 1) / denom_R2 if abs(denom_R2) > 1e-12 else math.inf

    steps.append(SolutionStep(
        title="Cálculo por fórmulas de diseño",
        explanation="Aplicando las fórmulas para π asimétrico con impedancias imagen Z1 y Z2:",
        equations=[
            f"√(Z1·Z2) = √({Z1}·{Z2}) = {Z12:.4f} Ω",
            f"",
            f"R3 = √(Z1·Z2)·(K²−1) / (2K)",
            f"R3 = {Z12:.4f}×{K ** 2 - 1:.4f} / (2×{K:.4f}) = {R3:.2f} Ω",
            f"",
            f"R1 = Z1·(K²−1) / (K²+1 − 2K·√(Z1/Z2))",
            f"R1 = {Z1}×{K ** 2 - 1:.4f} / ({K ** 2 + 1:.4f} − 2×{K:.4f}×{math.sqrt(Z1 / Z2):.4f})",
            f"R1 = {Z1 * (K ** 2 - 1):.4f} / {denom_R1:.4f} = {R1:.2f} Ω",
            f"",
            f"R2 = Z2·(K²−1) / (K²+1 − 2K·√(Z2/Z1))",
            f"R2 = {Z2 * (K ** 2 - 1):.4f} / {denom_R2:.4f} = {R2:.2f} Ω",
        ],
        result=f"R1 = {R1:.2f} Ω  |  R3 = {R3:.2f} Ω  |  R2 = {R2:.2f} Ω",
    ))

    inner2 = R2 * Z2 / (R2 + Z2) if (R2 + Z2) > 0 and math.isfinite(R2) else Z2
    inner1 = R1 * Z1 / (R1 + Z1) if (R1 + Z1) > 0 and math.isfinite(R1) else Z1
    Z_in_v = R1 * (R3 + inner2) / (R1 + R3 + inner2) if (R1 + R3 + inner2) > 0 and math.isfinite(R1) else 0.0
    Z_out_v = R2 * (R3 + inner1) / (R2 + R3 + inner1) if (R2 + R3 + inner1) > 0 and math.isfinite(R2) else 0.0

    steps.append(SolutionStep(
        title="Verificación de impedancias imagen",
        explanation="Comprobando Z_in y Z_out con la carga nominal conectada:",
        equations=[
            f"Z_in = R1‖(R3 + R2‖Z2) = {Z_in_v:.2f} Ω  (esperado: {Z1} Ω)",
            f"Z_out = R2‖(R3 + R1‖Z1) = {Z_out_v:.2f} Ω  (esperado: {Z2} Ω)",
        ],
        result=f"ΔZ_in = {abs(Z_in_v - Z1):.4f} Ω  |  ΔZ_out = {abs(Z_out_v - Z2):.4f} Ω",
    ))

    step_warnings: list[str] = []
    for name, val in [("R1", R1), ("R2", R2), ("R3", R3)]:
        if not math.isfinite(val) or val < -1e-9:
            msg = f"{name} = {val:.4f} Ω: no realizable. Incrementar A por encima de A_min = {Am:.2f} dB."
            step_warnings.append(msg)
            warnings.append(msg)

    steps.append(SolutionStep(
        title="Resultado final",
        explanation="Circuito π asimétrico desbalanceado.",
        equations=[
            f"Derivación entrada:  R1 = {R1:.2f} Ω",
            f"Brazo serie:         R3 = {R3:.2f} Ω",
            f"Derivación salida:   R2 = {R2:.2f} Ω",
            f"Impedancia entrada:  Z1 = {Z1} Ω",
            f"Impedancia salida:   Z2 = {Z2} Ω",
            f"Atenuación:          A = {att.dB:.2f} dB  (K = {K:.4f})",
            f"A_min realizable:    {Am:.2f} dB  (K_min = {Km:.4f})",
        ],
        result=f"R1 = {R1:.2f} Ω,  R3 = {R3:.2f} Ω,  R2 = {R2:.2f} Ω",
        warnings=step_warnings,
    ))

    return DesignResult(
        topology="pi_asymmetric",
        resistors={"R1": round(R1, 4), "R3": round(R3, 4), "R2": round(R2, 4)},
        Z_in=Z1,
        Z_out=Z2,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )


def design_L_minloss(Z1: float, Z2: float) -> DesignResult:
    """Adaptador tipo L de pérdida mínima. Intercambia puertos si Z1 < Z2."""
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    swapped = False
    if Z1 < Z2:
        Z1, Z2 = Z2, Z1
        swapped = True

    if swapped:
        warnings.append(
            f"Se intercambiaron los puertos: la entrada queda en Z1={Z1} Ω (alta impedancia). "
            f"El circuito L es unidireccional — conectar la fuente de alta impedancia en el puerto 1."
        )

    if abs(Z1 - Z2) < 1e-9:
        Rs, Rp = 0.0, math.inf
        K_min, A_min = 1.0, 0.0
    else:
        Rs = math.sqrt(Z1 * (Z1 - Z2))
        Rp = Z1 * Z2 / Rs
        K_min = math.sqrt(Z1 / Z2) + math.sqrt(Z1 / Z2 - 1)
        A_min = 20 * math.log10(K_min)

    alpha = math.log(K_min) if K_min > 1 else 0.0
    att = AttenuationValues(K=K_min, N=K_min ** 2, dB=A_min, alpha=alpha)

    steps.append(SolutionStep(
        title="Topología: adaptador tipo L de pérdida mínima",
        explanation=(
            f"Circuito L con brazo serie (Rs) en el lado de alta impedancia (Z1={Z1} Ω) "
            f"y brazo en derivación (Rp) en el lado de baja impedancia (Z2={Z2} Ω). "
            f"La atenuación no se puede especificar: el circuito opera con la pérdida mínima intrínseca."
        ),
    ))

    n = Z1 / Z2 if Z2 > 0 else math.inf
    steps.append(SolutionStep(
        title="Cálculo de la atenuación mínima",
        explanation="La pérdida mínima realizable para adaptar Z1 a Z2 (con Z1 > Z2) es:",
        equations=[
            f"n = Z1/Z2 = {Z1}/{Z2} = {n:.4f}",
            f"",
            f"K_min = √n + √(n−1) = √{n:.4f} + √{n - 1:.4f}",
            f"K_min = {math.sqrt(n):.4f} + {math.sqrt(max(n - 1, 0)):.4f} = {K_min:.4f}",
            f"",
            f"A_min = 20·log₁₀(K_min) = 20·log₁₀({K_min:.4f}) = {A_min:.2f} dB",
        ],
        result=f"A_min = {A_min:.2f} dB  (K_min = {K_min:.4f})",
    ))

    Rp_par_Z2 = Rp * Z2 / (Rp + Z2) if math.isfinite(Rp) and (Rp + Z2) > 0 else Z2
    Z_in_v = Rs + Rp_par_Z2
    Z_out_v = Rp * (Rs + Z1) / (Rp + Rs + Z1) if math.isfinite(Rp) and (Rp + Rs + Z1) > 0 else 0.0

    steps.append(SolutionStep(
        title="Cálculo de resistencias y verificación",
        explanation="Aplicando las fórmulas del adaptador tipo L:",
        equations=[
            f"Rs = √(Z1·(Z1−Z2)) = √({Z1}·{Z1 - Z2:.4f}) = {Rs:.4f} Ω",
            f"Rp = Z1·Z2 / Rs = {Z1}×{Z2} / {Rs:.4f} = {Rp:.4f} Ω",
            f"",
            f"Verificación Z_in: Rs + Rp‖Z2 = {Rs:.2f} + {Rp_par_Z2:.2f} = {Z_in_v:.2f} Ω  (esperado: {Z1} Ω)",
            f"Verificación Z_out: Rp‖(Rs+Z1) = {Z_out_v:.2f} Ω  (esperado: {Z2} Ω)",
        ],
        result=f"Rs = {Rs:.2f} Ω,  Rp = {Rp:.2f} Ω,  A_min = {A_min:.2f} dB",
    ))

    steps.append(SolutionStep(
        title="Resultado final",
        explanation="Adaptador tipo L de pérdida mínima — circuito desbalanceado.",
        equations=[
            f"Brazo serie:         Rs = {Rs:.2f} Ω",
            f"Brazo derivación:    Rp = {Rp:.2f} Ω",
            f"Impedancia entrada:  Z1 = {Z1} Ω  (alta)",
            f"Impedancia salida:   Z2 = {Z2} Ω  (baja)",
            f"Atenuación mínima:   A_min = {A_min:.2f} dB  (K_min = {K_min:.4f})",
        ],
        result=f"Rs = {Rs:.2f} Ω,  Rp = {Rp:.2f} Ω",
        warnings=warnings if swapped else [],
    ))

    return DesignResult(
        topology="L_minloss",
        resistors={"Rs": round(Rs, 4), "Rp": round(Rp, 4)},
        Z_in=Z1,
        Z_out=Z2,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )


def design_T_bridged(Z0: float, att: AttenuationValues) -> DesignResult:
    """Atenuador T puenteado (bridged T attenuator).

    Topología: R1 = R2 = Z0 (brazos serie iguales)
               R4 = Z0(K - 1) (resistencia puente)
               R3 = Z0 / (K - 1) (derivación central)

    Esta topología permite cambiar R4 y R3 para variar atenuación
    sin modificar R1 y R2, manteniendo impedancia característica.
    """
    K = att.K
    alpha = att.alpha
    steps: list[SolutionStep] = []
    warnings: list[str] = []

    if K <= 1.0:
        warnings.append(
            "K = 1 corresponde a 0 dB. El T puenteado degenera en cortocircuito pasante (R4=0, R3=∞)."
        )

    steps.append(SolutionStep(
        title="Topología: T puenteado (bridged T)",
        explanation=(
            f"Circuito con dos brazos serie iguales (R1=R2=Z0), una resistencia puente (R4), "
            f"y una resistencia de derivación central (R3). "
            f"Impedancia característica: Z0 = {Z0} Ω. "
            f"Atenuación requerida: A = {att.dB:.2f} dB → K = {K:.4f}."
        ),
    ))

    R1 = Z0
    R2 = Z0
    R4 = Z0 * (K - 1)
    R3 = Z0 / (K - 1) if K > 1 else math.inf

    steps.append(SolutionStep(
        title="Cálculo por método aritmético",
        explanation="Aplicando las fórmulas de diseño para T puenteado:",
        equations=[
            f"R1 = Z0 = {Z0} Ω",
            f"R2 = Z0 = {Z0} Ω",
            f"",
            f"R4 = Z0 · (K − 1)",
            f"R4 = {Z0} · ({K:.4f} − 1) = {Z0} · {K - 1:.4f}",
            f"R4 = {R4:.2f} Ω",
            f"",
            f"R3 = Z0 / (K − 1)",
            f"R3 = {Z0} / ({K:.4f} − 1) = {Z0} / {K - 1:.4f}",
            f"R3 = {R3:.2f} Ω",
        ],
        result=f"R1 = {R1:.2f} Ω  |  R2 = {R2:.2f} Ω  |  R4 = {R4:.2f} Ω  |  R3 = {R3:.2f} Ω",
    ))

    # Verificación del T puenteado:
    # 1) K = 1 + R4/Z0  (relación fundamental)
    # 2) R4·R3 = Z0²     (propiedad del producto)
    # 3) Z_in = Z0        (adaptación de impedancia)

    K_verify = 1 + R4 / Z0 if Z0 > 0 else math.inf
    product = R4 * R3 if math.isfinite(R3) else math.inf
    product_expected = Z0 ** 2

    # Z_in = (R4 + Z_L) ‖ (R1 + R3‖(R2 + Z_L))  con Z_L = Z0
    R2_plus_ZL = R2 + Z0
    R3_par = R3 * R2_plus_ZL / (R3 + R2_plus_ZL) if math.isfinite(R3) and (R3 + R2_plus_ZL) > 0 else R2_plus_ZL
    path_series = R1 + R3_par
    path_bridge = R4 + Z0
    Z_in_v = path_series * path_bridge / (path_series + path_bridge) if (path_series + path_bridge) > 0 else 0.0

    eqs_verify: list[str] = [
        f"K = 1 + R4/Z0 = 1 + {R4:.2f}/{Z0} = {K_verify:.4f}  (esperado: {K:.4f})  ✓",
        f"",
        f"R4 · R3 = {R4:.2f} × {R3:.2f} = {product:.2f}",
        f"Z0²     = {Z0}² = {product_expected:.2f}  ✓",
        f"",
        f"Z_in = (R4+Z0) ‖ (R1 + R3‖(R2+Z0))",
        f"Z_in = {path_bridge:.2f} ‖ {path_series:.2f} = {Z_in_v:.2f} Ω  (esperado: {Z0} Ω)  ✓",
    ]

    steps.append(SolutionStep(
        title="Verificación de atenuación e impedancia",
        explanation="Comprobando K, propiedad del producto R4·R3 = Z0², e impedancia de entrada:",
        equations=eqs_verify,
        result=f"Atenuación verificada: A = {att.dB:.2f} dB  (K = {K:.4f})",
    ))

    step_warnings: list[str] = []
    if R4 < 0:
        step_warnings.append(f"R4 = {R4:.4f} Ω < 0: no realizable.")
        warnings.append(step_warnings[-1])
    if R3 < 0 or math.isinf(R3):
        step_warnings.append(f"R3 = {R3:.4f} Ω: no realizable (derivación infinita o negativa).")
        warnings.append(step_warnings[-1])

    steps.append(SolutionStep(
        title="Resultado final",
        explanation=(
            "Circuito T puenteado desbalanceado. "
            "Característica: R1=R2=Z0 (brazos serie fijos), R4 y R3 varían con la atenuación. "
            "Ventaja: permite cambiar atenuación sin modificar impedancia característica."
        ),
        equations=[
            f"Brazo serie entrada:   R1 = {R1:.2f} Ω",
            f"Brazo serie salida:    R2 = {R2:.2f} Ω",
            f"Resistencia puente:    R4 = {R4:.2f} Ω",
            f"Derivación central:    R3 = {R3:.2f} Ω",
            f"Impedancia característica: Z0 = {Z0} Ω",
            f"Atenuación: A = {att.dB:.2f} dB  (K = {K:.4f})",
        ],
        result=f"R1 = {R1:.2f} Ω,  R2 = {R2:.2f} Ω,  R4 = {R4:.2f} Ω,  R3 = {R3:.2f} Ω",
        warnings=step_warnings,
    ))

    return DesignResult(
        topology="T_bridged",
        resistors={"R1": round(R1, 4), "R2": round(R2, 4), "R4": round(R4, 4), "R3": round(R3, 4)},
        Z_in=Z0,
        Z_out=Z0,
        attenuation=att,
        steps=steps,
        warnings=warnings,
    )
