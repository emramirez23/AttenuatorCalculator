import math
import pytest
from backend.engines.conversion import from_dB, from_K, from_neper


class TestFromDB:
    def test_15dB(self):
        att, steps = from_dB(15)
        assert abs(att.K - 5.6234) < 0.001
        assert abs(att.N - 31.623) < 0.05
        assert abs(att.alpha - 1.7272) < 0.001
        assert abs(att.dB - 15) < 1e-9
        assert len(steps) == 1

    def test_0dB(self):
        att, _ = from_dB(0)
        assert att.K == pytest.approx(1.0)
        assert att.N == pytest.approx(1.0)
        assert att.alpha == pytest.approx(0.0)
        assert att.dB == pytest.approx(0.0)

    def test_1dB(self):
        att, _ = from_dB(1)
        assert abs(att.K - 1.1220) < 0.001

    def test_20dB(self):
        att, _ = from_dB(20)
        assert att.K == pytest.approx(10.0, rel=1e-4)
        assert att.N == pytest.approx(100.0, rel=1e-4)

    def test_step_contiene_ecuaciones(self):
        _, steps = from_dB(15)
        assert len(steps[0].equations) >= 3
        assert steps[0].result is not None

    def test_negativo_lanza_error(self):
        with pytest.raises(ValueError, match="negativa"):
            from_dB(-1)

    def test_negativo_grande_lanza_error(self):
        with pytest.raises(ValueError):
            from_dB(-40)


class TestFromK:
    def test_round_trip_desde_dB(self):
        att_orig, _ = from_dB(15)
        att_back, _ = from_K(att_orig.K)
        assert abs(att_back.dB - 15) < 0.001

    def test_K_igual_10_es_20dB(self):
        att, _ = from_K(10.0)
        assert abs(att.dB - 20.0) < 0.001

    def test_K_menor_que_1_lanza_error(self):
        with pytest.raises(ValueError, match="K debe ser"):
            from_K(0.5)

    def test_K_igual_1_es_0dB(self):
        att, _ = from_K(1.0)
        assert att.dB == pytest.approx(0.0, abs=1e-9)


class TestFromNeper:
    def test_round_trip_desde_dB(self):
        att_orig, _ = from_dB(20)
        att_back, _ = from_neper(att_orig.alpha)
        assert abs(att_back.dB - 20) < 0.01

    def test_1_neper_es_K_igual_e(self):
        att, _ = from_neper(1.0)
        assert abs(att.K - math.e) < 0.001
        assert abs(att.dB - 8.686) < 0.01

    def test_0_neper_es_0dB(self):
        att, _ = from_neper(0.0)
        assert att.K == pytest.approx(1.0)
        assert att.dB == pytest.approx(0.0)

    def test_negativo_lanza_error(self):
        with pytest.raises(ValueError):
            from_neper(-0.5)

    def test_consistencia_con_from_dB(self):
        for dB in [1, 6, 10, 20, 40]:
            att_a, _ = from_dB(dB)
            att_b, _ = from_neper(att_a.alpha)
            assert abs(att_b.K - att_a.K) < 0.001
