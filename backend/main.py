from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional

from .domain.models import DesignResult
from .engines import conversion, design

app = FastAPI(title="Simulador de Atenuadores", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConvertRequest(BaseModel):
    value: float
    unit: Literal["dB", "K", "neper"]


class DesignRequest(BaseModel):
    topology: Literal["T_symmetric", "pi_symmetric", "T_asymmetric", "pi_asymmetric", "L_minloss", "T_bridged"]
    Z0: Optional[float] = None          # simétrico: Z_in = Z_out = Z0
    Z1: Optional[float] = None          # asimétrico / L: impedancia de entrada
    Z2: Optional[float] = None          # asimétrico / L: impedancia de salida
    attenuation_dB: Optional[float] = None  # no se usa en L_minloss


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.3.0"}


@app.post("/api/convert")
def convert_attenuation(req: ConvertRequest):
    try:
        if req.unit == "dB":
            att, steps = conversion.from_dB(req.value)
        elif req.unit == "K":
            att, steps = conversion.from_K(req.value)
        else:
            att, steps = conversion.from_neper(req.value)
        return {
            "attenuation": att.model_dump(),
            "steps": [s.model_dump() for s in steps],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/design", response_model=DesignResult)
def design_attenuator(req: DesignRequest):
    try:
        if req.topology in ("T_symmetric", "pi_symmetric", "T_bridged"):
            if req.Z0 is None or req.Z0 <= 0:
                raise HTTPException(status_code=422, detail="Z0 es obligatorio y debe ser positivo para topologías simétricas.")
            if req.attenuation_dB is None:
                raise HTTPException(status_code=422, detail="attenuation_dB es obligatorio para topologías simétricas.")
            att, _ = conversion.from_dB(req.attenuation_dB)
            if req.topology == "T_symmetric":
                return design.design_T_symmetric(req.Z0, att)
            elif req.topology == "pi_symmetric":
                return design.design_pi_symmetric(req.Z0, att)
            else:  # T_bridged
                return design.design_T_bridged(req.Z0, att)

        if req.topology in ("T_asymmetric", "pi_asymmetric"):
            if req.Z1 is None or req.Z1 <= 0 or req.Z2 is None or req.Z2 <= 0:
                raise HTTPException(status_code=422, detail="Z1 y Z2 son obligatorios y deben ser positivos para topologías asimétricas.")
            if req.attenuation_dB is None:
                raise HTTPException(status_code=422, detail="attenuation_dB es obligatorio para topologías asimétricas.")
            att, _ = conversion.from_dB(req.attenuation_dB)
            if req.topology == "T_asymmetric":
                return design.design_T_asymmetric(req.Z1, req.Z2, att)
            return design.design_pi_asymmetric(req.Z1, req.Z2, att)

        if req.topology == "L_minloss":
            if req.Z1 is None or req.Z1 <= 0 or req.Z2 is None or req.Z2 <= 0:
                raise HTTPException(status_code=422, detail="Z1 y Z2 son obligatorios para el adaptador tipo L.")
            return design.design_L_minloss(req.Z1, req.Z2)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
