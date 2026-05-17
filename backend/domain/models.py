from pydantic import BaseModel
from typing import Optional


class SolutionStep(BaseModel):
    title: str
    explanation: str
    equations: list[str] = []
    result: Optional[str] = None
    warnings: list[str] = []


class AttenuationValues(BaseModel):
    K: float      # relación de tensiones V1/V2 >= 1
    N: float      # relación de potencias P1/P2 >= 1 (para Zin = Zout: N = K²)
    dB: float     # atenuación en decibeles >= 0
    alpha: float  # atenuación en Nepers >= 0


class DesignResult(BaseModel):
    topology: str
    resistors: dict[str, float]
    Z_in: float
    Z_out: float
    attenuation: AttenuationValues
    steps: list[SolutionStep]
    warnings: list[str] = []
