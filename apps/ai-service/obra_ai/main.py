from __future__ import annotations

import asyncio

import grpc
import uvicorn

from .api import app
from .container import settings
from .grpc_service import add_to_server


async def serve() -> None:
    grpc_server = grpc.aio.server()
    add_to_server(grpc_server)
    address = f"{settings.grpc_host}:{settings.grpc_port}"
    if grpc_server.add_insecure_port(address) == 0:
        raise RuntimeError(f"could not bind gRPC server to {address}")
    await grpc_server.start()

    http_server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=settings.http_host,
            port=settings.http_port,
            log_level="info",
        )
    )
    try:
        await http_server.serve()
    finally:
        await grpc_server.stop(grace=5)


if __name__ == "__main__":
    asyncio.run(serve())
