import math
from ..domain.models import AttenuationValues, SolutionStep


def from_dB(dB: float) -> tuple[AttenuationValues, list[SolutionStep]]:
    if dB < 0:
        raise ValueError(f"La atenuación no puede ser negativa. Se recibió {dB} dB.")
    K = 10 ** (dB / 20)
    N = 10 ** (dB / 10)
    alpha = math.log(K) if K > 1 else 0.0
    att = AttenuationValues(K=K, N=N, dB=dB, alpha=alpha)
    step = SolutionStep(
        title="Conversión de unidades de atenuación",
        explanation=f"Dado A = {dB} dB, se calculan las representaciones equivalentes:",
        equations=[
            f"K = 10^(A[dB] / 20) = 10^({dB} / 20) = {K:.4f}  (veces de tensión)",
            f"N = 10^(A[dB] / 10) = 10^({dB} / 10) = {N:.4f}  (veces de potencia, para Zin = Zout)",
            f"α = ln(K) = ln({K:.4f}) = {alpha:.4f} Nepers",
            f"Verificación: A = 8,686 · α = 8,686 × {alpha:.4f} = {8.686 * alpha:.4f} dB  ✓",
        ],
        result=f"K = {K:.4f} | N = {N:.4f} | α = {alpha:.4f} Np",
    )
    return att, [step]


def from_K(K: float) -> tuple[AttenuationValues, list[SolutionStep]]:
    if K < 1:
        raise ValueError(
            f"K debe ser >= 1 (representa atenuación, no ganancia). Se recibió K = {K}."
        )
    dB = 20 * math.log10(K) if K > 0 else 0.0
    N = K ** 2
    alpha = math.log(K) if K > 1 else 0.0
    att = AttenuationValues(K=K, N=N, dB=dB, alpha=alpha)
    step = SolutionStep(
        title="Conversión de unidades de atenuación",
        explanation=f"Dado K = {K:.4f}, se calculan las representaciones equivalentes:",
        equations=[
            f"A[dB] = 20 · log10(K) = 20 · log10({K:.4f}) = {dB:.4f} dB",
            f"N = K² = {K:.4f}² = {N:.4f}  (para Zin = Zout)",
            f"α = ln(K) = ln({K:.4f}) = {alpha:.4f} Nepers",
        ],
        result=f"A = {dB:.4f} dB | N = {N:.4f} | α = {alpha:.4f} Np",
    )
    return att, [step]


def from_neper(alpha: float) -> tuple[AttenuationValues, list[SolutionStep]]:
    if alpha < 0:
        raise ValueError(f"α debe ser >= 0. Se recibió α = {alpha}.")
    K = math.exp(alpha)
    dB = 8.686 * alpha
    N = K ** 2
    att = AttenuationValues(K=K, N=N, dB=dB, alpha=alpha)
    step = SolutionStep(
        title="Conversión de unidades de atenuación",
        explanation=f"Dado α = {alpha:.4f} Nepers, se calculan las representaciones equivalentes:",
        equations=[
            f"K = e^α = e^{alpha:.4f} = {K:.4f}  (veces de tensión)",
            f"A[dB] = 8,686 · α = 8,686 × {alpha:.4f} = {dB:.4f} dB",
            f"N = K² = {K:.4f}² = {N:.4f}  (para Zin = Zout)",
        ],
        result=f"K = {K:.4f} | A = {dB:.4f} dB | N = {N:.4f}",
    )
    return att, [step]
