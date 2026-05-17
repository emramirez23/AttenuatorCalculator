"""
Tests for T_bridged (bridged T) attenuator topology.
Based on official course exercises 3, 5, and 9 from Teoría de Circuitos II · UTN.
"""

import pytest
import math
from backend.domain.models import DesignResult, SolutionStep, AttenuationValues
from backend.engines.conversion import from_dB
from backend.engines.design import design_T_bridged


class TestTBridgedSymmetric:
    """T Bridged attenuator tests with symmetric impedance (Z0)."""

    def test_T_bridged_basic_calculation(self):
        """Test basic T bridged design with Z0=600Ω and 6dB attenuation."""
        att, _ = from_dB(6.0)
        result = design_T_bridged(600.0, att)

        # Verify structure
        assert result.topology == "T_bridged"
        assert result.Z_in == 600.0
        assert result.Z_out == 600.0
        assert len(result.steps) == 4
        assert len(result.resistors) == 4
        assert set(result.resistors.keys()) == {"R1", "R2", "R3", "R4"}

        # Basic verification: R1 = R2 = Z0 for T bridged
        assert result.resistors["R1"] == pytest.approx(600.0, rel=1e-3)
        assert result.resistors["R2"] == pytest.approx(600.0, rel=1e-3)

        # All resistances should be positive for K > 1
        for r_val in result.resistors.values():
            assert r_val > 0

    def test_T_bridged_0dB(self):
        """Exercise 3a: T Bridged with 0 dB (K=1, no attenuation)."""
        att, _ = from_dB(0.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.Z_in == 600.0
        assert result.Z_out == 600.0
        assert result.attenuation.dB == pytest.approx(0.0, abs=1e-6)
        assert result.attenuation.K == pytest.approx(1.0, rel=1e-6)

        # Warnings for K=1
        assert any("K = 1" in w or "0 dB" in w for w in result.warnings)

    def test_T_bridged_3dB_600ohm(self):
        """Exercise 3b: T Bridged with 3 dB and Z0=600Ω."""
        att, _ = from_dB(3.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.Z_in == 600.0
        assert result.Z_out == 600.0
        assert result.attenuation.dB == pytest.approx(3.0, rel=1e-6)

        # Verify R values calculated from formulas
        K = att.K
        expected_R1 = 600.0
        expected_R2 = 600.0
        expected_R4 = 600.0 * (K - 1)
        expected_R3 = 600.0 / (K - 1)

        assert result.resistors["R1"] == pytest.approx(expected_R1, rel=1e-3)
        assert result.resistors["R2"] == pytest.approx(expected_R2, rel=1e-3)
        assert result.resistors["R4"] == pytest.approx(expected_R4, rel=1e-2)
        assert result.resistors["R3"] == pytest.approx(expected_R3, rel=1e-2)

    def test_T_bridged_6dB_600ohm(self):
        """Exercise 3c: T Bridged with 6 dB and Z0=600Ω."""
        att, _ = from_dB(6.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(6.0, rel=1e-6)

        K = att.K
        assert result.resistors["R1"] == pytest.approx(600.0, rel=1e-3)
        assert result.resistors["R2"] == pytest.approx(600.0, rel=1e-3)
        assert result.resistors["R4"] == pytest.approx(600.0 * (K - 1), rel=1e-2)
        assert result.resistors["R3"] == pytest.approx(600.0 / (K - 1), rel=1e-2)

    def test_T_bridged_12dB_600ohm(self):
        """Exercise 3d: T Bridged with 12 dB and Z0=600Ω."""
        att, _ = from_dB(12.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(12.0, rel=1e-6)

        K = att.K
        assert result.resistors["R1"] == pytest.approx(600.0, rel=1e-3)
        assert result.resistors["R4"] == pytest.approx(600.0 * (K - 1), rel=1e-2)

    def test_T_bridged_24dB_600ohm(self):
        """Exercise 3e: T Bridged with 24 dB and Z0=600Ω."""
        att, _ = from_dB(24.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(24.0, rel=1e-6)

        K = att.K
        assert result.resistors["R1"] == pytest.approx(600.0, rel=1e-3)
        assert result.resistors["R4"] == pytest.approx(600.0 * (K - 1), rel=1e-2)

    def test_T_bridged_6dB_75ohm(self):
        """Exercise 5a: T Bridged with 6 dB and Z0=75Ω."""
        att, _ = from_dB(6.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.Z_in == 75.0
        assert result.Z_out == 75.0
        assert result.attenuation.dB == pytest.approx(6.0, rel=1e-6)

        K = att.K
        assert result.resistors["R1"] == pytest.approx(75.0, rel=1e-3)
        assert result.resistors["R2"] == pytest.approx(75.0, rel=1e-3)
        assert result.resistors["R4"] == pytest.approx(75.0 * (K - 1), rel=1e-2)
        assert result.resistors["R3"] == pytest.approx(75.0 / (K - 1), rel=1e-2)

    def test_T_bridged_12dB_75ohm(self):
        """Exercise 5b: T Bridged with 12 dB and Z0=75Ω."""
        att, _ = from_dB(12.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(12.0, rel=1e-6)

        K = att.K
        assert result.resistors["R1"] == pytest.approx(75.0, rel=1e-3)

    def test_T_bridged_18dB_75ohm(self):
        """Exercise 5c: T Bridged with 18 dB and Z0=75Ω."""
        att, _ = from_dB(18.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(18.0, rel=1e-6)

    def test_T_bridged_24dB_75ohm(self):
        """Exercise 5d: T Bridged with 24 dB and Z0=75Ω."""
        att, _ = from_dB(24.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(24.0, rel=1e-6)

    def test_T_bridged_10dB_75ohm(self):
        """Exercise 9a: T Bridged with 10 dB and Z0=75Ω."""
        att, _ = from_dB(10.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(10.0, rel=1e-6)

    def test_T_bridged_15dB_75ohm(self):
        """Exercise 9b: T Bridged with 15 dB and Z0=75Ω."""
        att, _ = from_dB(15.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(15.0, rel=1e-6)

    def test_T_bridged_20dB_75ohm(self):
        """Exercise 9c: T Bridged with 20 dB and Z0=75Ω."""
        att, _ = from_dB(20.0)
        result = design_T_bridged(75.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(20.0, rel=1e-6)

    def test_T_bridged_steps_structure(self):
        """Verify the structure of the 4 solution steps."""
        att, _ = from_dB(6.0)
        result = design_T_bridged(600.0, att)

        assert len(result.steps) == 4

        # Step 1: Topology description
        assert result.steps[0].title.lower().find("topología") >= 0 or result.steps[0].title.lower().find("topology") >= 0
        assert result.steps[0].explanation is not None

        # Step 2: Calculation
        assert result.steps[1].title.lower().find("cálculo") >= 0 or result.steps[1].title.lower().find("calculation") >= 0
        assert len(result.steps[1].equations) > 0

        # Step 3: Verification
        assert result.steps[2].title.lower().find("verificación") >= 0 or result.steps[2].title.lower().find("verification") >= 0

        # Step 4: Final result
        assert result.steps[3].title.lower().find("resultado") >= 0 or result.steps[3].title.lower().find("result") >= 0

    def test_T_bridged_high_attenuation(self):
        """Test T Bridged with high attenuation (36 dB)."""
        att, _ = from_dB(36.0)
        result = design_T_bridged(600.0, att)

        assert result.topology == "T_bridged"
        assert result.attenuation.dB == pytest.approx(36.0, rel=1e-6)

        K = att.K
        # With high attenuation, K is large, so R4 should be large and R3 should be small
        assert result.resistors["R4"] > 600.0  # Should be greater than Z0
        assert result.resistors["R3"] < 600.0  # Should be less than Z0
