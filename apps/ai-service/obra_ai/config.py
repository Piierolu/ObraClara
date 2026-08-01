from __future__ import annotations

import os
from dataclasses import dataclass


def _positive_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if name.endswith("PORT") and not 1 <= value <= 65535:
        raise ValueError(f"{name} must be between 1 and 65535")
    if value < 1:
        raise ValueError(f"{name} must be positive")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    mode: str
    http_host: str
    http_port: int
    grpc_host: str
    grpc_port: int
    cache_size: int

    @classmethod
    def from_env(cls) -> "Settings":
        mode = os.getenv("AI_MODE", "MOCK").upper()
        if mode != "MOCK":
            raise ValueError("Only AI_MODE=MOCK is supported by this MVP")
        return cls(
            mode=mode,
            http_host=os.getenv("HTTP_HOST", "0.0.0.0"),
            http_port=_positive_int("HTTP_PORT", 8000),
            grpc_host=os.getenv("GRPC_HOST", "0.0.0.0"),
            grpc_port=_positive_int("GRPC_PORT", 50051),
            cache_size=_positive_int("IDEMPOTENCY_CACHE_SIZE", 256),
        )
