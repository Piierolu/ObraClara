FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AI_MODE=MOCK \
    HTTP_PORT=8000 \
    GRPC_PORT=50051

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir . && python -m obra_ai.codegen

EXPOSE 8000 50051

CMD ["python", "-m", "obra_ai.main"]
