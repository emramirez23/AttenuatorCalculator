import math
import pytest
from backend.engines.conversion import from_dB
from backend.engines.design import design_T_symmetric, design_pi_symmetric


def z0_from_T(R1: float, R3: float) -> float:
    """Z0 de un T simétrico medido por circuito abierto/cortocircuito."""
    Z_OC = R1 + R3
    Z_SC = R1 + R1 * R3 / (R1 + R3)
    return math.sqrt(Z_OC * Z_SC)


def z0_from_pi(R3: float, R1: float) -> float:
    """Z0 de un π simétrico medido por circuito abierto/cortocircuito."""
    Z_OC = R1 * (R3 + R1) / (2 * R1 + R3)
    Z_SC = R1 * R3 / (R1 + R3)
    return math.sqrt(Z_OC * Z_SC)


class TestTSimetrico:
    def test_ej15a_15dB_Z0_500(self):
        """Ejercicio 15a: T simétrico, 15 dB, Z0 = 500 Ω."""
        att, _ = from_dB(15)
        result = design_T_symmetric(500, att)
        assert abs(result.resistors["R1"] - 349.0) < 0.5
        assert abs(result.resistors["R3"] - 183.6) < 0.5
        assert result.Z_in == 500
        assert result.Z_out == 500
        assert not result.warnings

    def test_formulas_aritmetica_e_hiperbolica_coinciden(self):
        """Las dos familias de fórmulas deben dar el mismo resultado."""
        for dB in [1, 6, 10, 15, 20, 40]:
            att, _ = from_dB(dB)
            result = design_T_symmetric(600, att)
            K, alpha = att.K, att.alpha
            R1_arith = 600 * (K - 1) / (K + 1)
            R1_hyp = 600 * math.tanh(alpha / 2)
            R3_arith = 600 * 2 * K / (K ** 2 - 1)
            R3_hyp = 600 / math.sinh(alpha)
            assert abs(R1_arith - R1_hyp) < 0.01, f"R1 difiere a {dB} dB"
            assert abs(R3_arith - R3_hyp) < 0.01, f"R3 difiere a {dB} dB"

    def test_Z0_preservada_por_OC_SC(self):
        """El circuito diseñado debe reproducir Z0 al medir OC/SC."""
        for dB, Z0 in [(6, 50), (10, 75), (15, 300), (20, 600)]:
            att, _ = from_dB(dB)
            result = design_T_symmetric(Z0, att)
            R1 = result.resistors["R1"]
            R3 = result.resistors["R3"]
            assert abs(z0_from_T(R1, R3) - Z0) < 0.5, f"Z0 no preservada a {dB} dB, Z0={Z0}"

    def test_ej13a_analisis_Z0_desde_R1_R3(self):
        """Ejercicio 13a: T dado R1=8, R3=21 → Z0 = 20 Ω."""
        assert abs(z0_from_T(8, 21) - 20.0) < 0.1

    def test_ej13b_analisis_Z0_desde_R1_R3(self):
        """Ejercicio 13b: T dado R1=10, R3=15 → Z0 = 20 Ω."""
        assert abs(z0_from_T(10, 15) - 20.0) < 0.1

    def test_ej13c_analisis_Z0_desde_R1_R3(self):
        """Ejercicio 13c: T dado R1=200, R3=56.25 → Z0 = 250 Ω."""
        assert abs(z0_from_T(200, 56.25) - 250.0) < 0.5

    def test_genera_4_pasos(self):
        att, _ = from_dB(10)
        result = design_T_symmetric(75, att)
        assert len(result.steps) == 4

    def test_1dB_Z0_50(self):
        att, _ = from_dB(1)
        result = design_T_symmetric(50, att)
        K = att.K
        assert abs(result.resistors["R1"] - 50 * (K - 1) / (K + 1)) < 0.01
        assert abs(result.resistors["R3"] - 50 * 2 * K / (K ** 2 - 1)) < 0.01


class TestPiSimetrico:
    def test_ej15b_15dB_Z0_500(self):
        """Ejercicio 15b: π simétrico, 15 dB, Z0 = 500 Ω."""
        att, _ = from_dB(15)
        result = design_pi_symmetric(500, att)
        assert abs(result.resistors["R3"] - 1361.4) < 1.0
        assert abs(result.resistors["R1"] - 716.3) < 1.0

    def test_ej4_1dB_Z0_50(self):
        """Ejemplo 4: π simétrico celda 1 dB, Z0 = 50 Ω. Esperado: R3=5.76, R1=870.5."""
        att, _ = from_dB(1)
        result = design_pi_symmetric(50, att)
        assert abs(result.resistors["R3"] - 5.76) < 0.1
        assert abs(result.resistors["R1"] - 870.5) < 1.0

    def test_ej4_2dB_Z0_50(self):
        """Ejemplo 4: π simétrico celda 2 dB, Z0 = 50 Ω. Esperado: R3=11.6, R1=436.7."""
        att, _ = from_dB(2)
        result = design_pi_symmetric(50, att)
        assert abs(result.resistors["R3"] - 11.6) < 0.2
        assert abs(result.resistors["R1"] - 436.7) < 1.0

    def test_formulas_aritmetica_e_hiperbolica_coinciden(self):
        """Las dos familias de fórmulas deben dar el mismo resultado."""
        for dB in [1, 6, 10, 15, 20]:
            att, _ = from_dB(dB)
            result = design_pi_symmetric(50, att)
            K, alpha = att.K, att.alpha
            R3_arith = 50 * (K ** 2 - 1) / (2 * K)
            R3_hyp = 50 * math.sinh(alpha)
            R1_arith = 50 * (K + 1) / (K - 1)
            R1_hyp = 50 / math.tanh(alpha / 2)
            assert abs(R3_arith - R3_hyp) < 0.01, f"R3 difiere a {dB} dB"
            assert abs(R1_arith - R1_hyp) < 0.01, f"R1 difiere a {dB} dB"

    def test_Z0_preservada_por_OC_SC(self):
        """El circuito diseñado debe reproducir Z0 al medir OC/SC."""
        for dB, Z0 in [(6, 50), (10, 75), (15, 300), (20, 600)]:
            att, _ = from_dB(dB)
            result = design_pi_symmetric(Z0, att)
            R3 = result.resistors["R3"]
            R1 = result.resistors["R1"]
            assert abs(z0_from_pi(R3, R1) - Z0) < 0.5, f"Z0 no preservada a {dB} dB, Z0={Z0}"

    def test_ej14_analisis_Z0_desde_R3_R1(self):
        """Ejercicio 14: π dado R3=500, R1=1000 → Z0 = 447.2 Ω, A = 8.36 dB."""
        R3, R1 = 500, 1000
        Z0_calc = z0_from_pi(R3, R1)
        assert abs(Z0_calc - 447.2) < 0.5

        alpha = math.asinh(R3 / Z0_calc)
        K = math.exp(alpha)
        A_dB = 20 * math.log10(K)
        assert abs(A_dB - 8.36) < 0.05

    def test_genera_4_pasos(self):
        att, _ = from_dB(10)
        result = design_pi_symmetric(75, att)
        assert len(result.steps) == 4

    def test_T_y_pi_misma_Z0_mismo_dB_son_duales(self):
        """T y π simétricos diseñados con los mismos Z0 y dB deben tener Z0 idéntica."""
        att, _ = from_dB(20)
        t = design_T_symmetric(100, att)
        p = design_pi_symmetric(100, att)
        Z0_T = z0_from_T(t.resistors["R1"], t.resistors["R3"])
        Z0_pi = z0_from_pi(p.resistors["R3"], p.resistors["R1"])
        assert abs(Z0_T - Z0_pi) < 0.5
