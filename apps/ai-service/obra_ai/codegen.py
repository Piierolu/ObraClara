from __future__ import annotations

from pathlib import Path

from grpc_tools import protoc


PACKAGE_ROOT = Path(__file__).resolve().parent
SERVICE_ROOT = PACKAGE_ROOT.parent
GENERATED_ROOT = PACKAGE_ROOT / "generated"
VENDORED_PROTO = PACKAGE_ROOT / "schema" / "document_ai.proto"
REPOSITORY_PROTO = (SERVICE_ROOT / "../../contracts/proto/document_ai.proto").resolve()


def generate() -> Path:
    proto = REPOSITORY_PROTO if REPOSITORY_PROTO.is_file() else VENDORED_PROTO
    if not proto.is_file():
        raise FileNotFoundError("document_ai.proto was not found in the repository or package fallback")
    GENERATED_ROOT.mkdir(exist_ok=True)
    init = GENERATED_ROOT / "__init__.py"
    init.touch(exist_ok=True)

    exit_code = protoc.main(
        [
            "grpc_tools.protoc",
            f"--proto_path={proto.parent}",
            f"--python_out={GENERATED_ROOT}",
            f"--grpc_python_out={GENERATED_ROOT}",
            str(proto),
        ]
    )
    if exit_code:
        raise RuntimeError(f"protoc failed with exit code {exit_code}")

    grpc_module = GENERATED_ROOT / "document_ai_pb2_grpc.py"
    source = grpc_module.read_text(encoding="utf-8")
    source = source.replace(
        "import document_ai_pb2 as document__ai__pb2",
        "from . import document_ai_pb2 as document__ai__pb2",
    )
    grpc_module.write_text(source, encoding="utf-8")
    return proto


def ensure_generated() -> None:
    if not (GENERATED_ROOT / "document_ai_pb2.py").is_file() or not (
        GENERATED_ROOT / "document_ai_pb2_grpc.py"
    ).is_file():
        generate()


if __name__ == "__main__":
    selected = generate()
    print(f"Generated Python gRPC stubs from {selected}")
