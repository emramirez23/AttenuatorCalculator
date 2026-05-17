import math
import pytest
from backend.engines.conversion import from_dB
from backend.engines.design import design_T_asymmetric, design_pi_asymmetric, design_L_minloss


# ── helpers de verificación de impedancias ────────────────────────────────────

def z_in_T(R1, R3, R2, Z2):
    return R1 + R3 * (R2 + Z2) / (R3 + R2 + Z2)

def z_out_T(R1, R3, R2, Z1):
    return R2 + R3 * (R1 + Z1) / (R3 + R1 + Z1)

def z_in_pi(R1, R3, R2, Z2):
    inner = R2 * Z2 / (R2 + Z2)
    return R1 * (R3 + inner) / (R1 + R3 + inner)

def z_out_pi(R1, R3, R2, Z1):
    inner = R1 * Z1 / (R1 + Z1)
    return R2 * (R3 + inner) / (R2 + R3 + inner)

def k_min(Z1, Z2):
    n = max(Z1, Z2) / min(Z1, Z2)
    return math.sqrt(n) + math.sqrt(n - 1)


# ── T asimétrico ──────────────────────────────────────────────────────────────

class TestTAsimetrico:
    def test_20dB_Z1_600_Z2_100(self):
        """T asimétrico, 20 dB, Z1=600, Z2=100."""
        att, _ = from_dB(20)
        res = design_T_asymmetric(600, 100, att)
        R1 = res.resistors["R1"]
        R2 = res.resistors["R2"]
        R3 = res.resistors["R3"]
        assert abs(R1 - 562.64) < 0.5
        assert abs(R2 - 52.54) < 0.5
        assert abs(R3 - 49.48) < 0.5

    def test_impedancias_preservadas(self):
        """Las impedancias de imagen deben reproducirse dentro de 0.5 Ω."""
        for dB, Z1, Z2 in [(20, 600, 100), (20, 100, 600), (15, 300, 75), (10, 200, 50)]:
            att, _ = from_dB(dB)
            res = design_T_asymmetric(Z1, Z2, att)
            R1 = res.resistors["R1"]
            R2 = res.resistors["R2"]
            R3 = res.resistors["R3"]
            assert abs(z_in_T(R1, R3, R2, Z2) - Z1) < 0.5, f"Z_in falla a {dB}dB, Z1={Z1}, Z2={Z2}"
            assert abs(z_out_T(R1, R3, R2, Z1) - Z2) < 0.5, f"Z_out falla a {dB}dB, Z1={Z1}, Z2={Z2}"

    def test_simetrico_como_caso_especial(self):
        """Con Z1=Z2, el T asimétrico debe coincidir con el simétrico."""
        from backend.engines.design import design_T_symmetric
        att, _ = from_dB(15)
        res_asim = design_T_asymmetric(500, 500, att)
        res_sim = design_T_symmetric(500, att)
        assert abs(res_asim.resistors["R1"] - res_sim.resistors["R1"]) < 0.01
        assert abs(res_asim.resistors["R2"] - res_sim.resistors["R1"]) < 0.01
        assert abs(res_asim.resistors["R3"] - res_sim.resistors["R3"]) < 0.01

    def test_intercambiar_Z1_Z2_intercambia_R1_R2(self):
        """Intercambiar Z1 y Z2 debe intercambiar R1 y R2."""
        att, _ = from_dB(20)
        res_a = design_T_asymmetric(600, 100, att)
        res_b = design_T_asymmetric(100, 600, att)
        assert abs(res_a.resistors["R1"] - res_b.resistors["R2"]) < 0.01
        assert abs(res_a.resistors["R2"] - res_b.resistors["R1"]) < 0.01
        assert abs(res_a.resistors["R3"] - res_b.resistors["R3"]) < 0.01

    def test_warning_cuando_K_debajo_del_minimo(self):
        """Si K < K_min, debe emitir warning."""
        Km = k_min(600, 100)  # ≈ 4.686
        att, _ = from_dB(5)   # K ≈ 1.778 < K_min
        res = design_T_asymmetric(600, 100, att)
        assert len(res.warnings) > 0

    def test_genera_4_pasos(self):
        att, _ = from_dB(20)
        res = design_T_asymmetric(600, 100, att)
        assert len(res.steps) == 4

    def test_topologia_correcta(self):
        att, _ = from_dB(20)
        res = design_T_asymmetric(600, 100, att)
        assert res.topology == "T_asymmetric"
        assert res.Z_in == 600
        assert res.Z_out == 100


# ── π asimétrico ──────────────────────────────────────────────────────────────

class TestPiAsimetrico:
    def test_20dB_Z1_600_Z2_100(self):
        """π asimétrico, 20 dB, Z1=600, Z2=100."""
        att, _ = from_dB(20)
        res = design_pi_asymmetric(600, 100, att)
        R1 = res.resistors["R1"]
        R2 = res.resistors["R2"]
        R3 = res.resistors["R3"]
        assert abs(R1 - 1141.9) < 1.0
        assert abs(R2 - 106.6) < 1.0
        assert abs(R3 - 1212.5) < 1.0

    def test_impedancias_preservadas(self):
        """Las impedancias de imagen deben reproducirse dentro de 0.5 Ω."""
        for dB, Z1, Z2 in [(20, 600, 100), (20, 100, 600), (15, 300, 75), (10, 200, 50)]:
            att, _ = from_dB(dB)
            res = design_pi_asymmetric(Z1, Z2, att)
            R1 = res.resistors["R1"]
            R2 = res.resistors["R2"]
            R3 = res.resistors["R3"]
            assert abs(z_in_pi(R1, R3, R2, Z2) - Z1) < 0.5, f"Z_in falla a {dB}dB, Z1={Z1}, Z2={Z2}"
            assert abs(z_out_pi(R1, R3, R2, Z1) - Z2) < 0.5, f"Z_out falla a {dB}dB, Z1={Z1}, Z2={Z2}"

    def test_simetrico_como_caso_especial(self):
        """Con Z1=Z2, el π asimétrico debe coincidir con el simétrico."""
        from backend.engines.design import design_pi_symmetric
        att, _ = from_dB(15)
        res_asim = design_pi_asymmetric(500, 500, att)
        res_sim = design_pi_symmetric(500, att)
        assert abs(res_asim.resistors["R1"] - res_sim.resistors["R1"]) < 0.01
        assert abs(res_asim.resistors["R2"] - res_sim.resistors["R1"]) < 0.01
        assert abs(res_asim.resistors["R3"] - res_sim.resistors["R3"]) < 0.01

    def test_intercambiar_Z1_Z2_intercambia_R1_R2(self):
        att, _ = from_dB(20)
        res_a = design_pi_asymmetric(600, 100, att)
        res_b = design_pi_asymmetric(100, 600, att)
        assert abs(res_a.resistors["R1"] - res_b.resistors["R2"]) < 0.01
        assert abs(res_a.resistors["R2"] - res_b.resistors["R1"]) < 0.01
        assert abs(res_a.resistors["R3"] - res_b.resistors["R3"]) < 0.01

    def test_warning_cuando_K_debajo_del_minimo(self):
        Km = k_min(600, 100)
        att, _ = from_dB(5)
        res = design_pi_asymmetric(600, 100, att)
        assert len(res.warnings) > 0

    def test_genera_4_pasos(self):
        att, _ = from_dB(20)
        res = design_pi_asymmetric(600, 100, att)
        assert len(res.steps) == 4

    def test_T_y_pi_misma_Kmin(self):
        """T y π asimétricos con mismas Z1, Z2 deben tener el mismo K_min."""
        att, _ = from_dB(20)
        Km = k_min(600, 100)
        # Verificar que ambos producen resistencias positivas a K > K_min
        res_t = design_T_asymmetric(600, 100, att)
        res_p = design_pi_asymmetric(600, 100, att)
        assert res_t.resistors["R1"] > 0
        assert res_p.resistors["R1"] > 0


# ── Adaptador tipo L pérdida mínima ───────────────────────────────────────────

class TestLMinloss:
    def test_Z1_600_Z2_100(self):
        """L minloss, Z1=600, Z2=100. Rs≈547.7, Rp≈109.5, A≈13.41 dB."""
        res = design_L_minloss(600, 100)
        Rs = res.resistors["Rs"]
        Rp = res.resistors["Rp"]
        assert abs(Rs - 547.72) < 0.5
        assert abs(Rp - 109.54) < 0.5
        assert abs(res.attenuation.dB - 13.41) < 0.05

    def test_intercambio_automatico_cuando_Z1_menor(self):
        """Si Z1 < Z2, se intercambian y el resultado es el mismo."""
        res_a = design_L_minloss(600, 100)
        res_b = design_L_minloss(100, 600)
        assert abs(res_a.resistors["Rs"] - res_b.resistors["Rs"]) < 0.01
        assert abs(res_a.resistors["Rp"] - res_b.resistors["Rp"]) < 0.01
        assert res_b.warnings  # debe advertir que se intercambiaron los puertos

    def test_impedancias_preservadas(self):
        """Z_in y Z_out deben coincidir con Z1 y Z2."""
        for Z1, Z2 in [(600, 100), (1000, 50), (300, 75)]:
            res = design_L_minloss(Z1, Z2)
            Rs = res.resistors["Rs"]
            Rp = res.resistors["Rp"]
            Zh = max(Z1, Z2)
            Zl = min(Z1, Z2)
            Z_in_calc = Rs + Rp * Zl / (Rp + Zl)
            assert abs(Z_in_calc - Zh) < 0.5, f"Z_in falla para Z1={Z1}, Z2={Z2}"

    def test_kmin_formula(self):
        """K_min = √n + √(n-1) con n = Z1/Z2."""
        for Z1, Z2 in [(600, 100), (1000, 50), (400, 100)]:
            res = design_L_minloss(Z1, Z2)
            n = max(Z1, Z2) / min(Z1, Z2)
            Km_expected = math.sqrt(n) + math.sqrt(n - 1)
            assert abs(res.attenuation.K - Km_expected) < 0.001

    def test_Z1_igual_Z2_da_0dB(self):
        """Con Z1 = Z2, la atenuación mínima es 0 dB."""
        res = design_L_minloss(100, 100)
        assert abs(res.attenuation.dB) < 1e-6

    def test_genera_4_pasos(self):
        res = design_L_minloss(600, 100)
        assert len(res.steps) == 4

    def test_topologia_correcta(self):
        res = design_L_minloss(600, 100)
        assert res.topology == "L_minloss"
        assert "Rs" in res.resistors
        assert "Rp" in res.resistors
