FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AAS_SQLITE_PATH=/tmp/aas.sqlite
ENV AAS_SEED=true

COPY operations/health /deps/health
COPY operations/observability /deps/observability
COPY integration/rest-api /deps/rest-api
COPY asset-semantic/aas-foundation /app

RUN pip install --no-cache-dir /deps/health /deps/observability \
    && pip install --no-cache-dir /deps/rest-api --no-deps \
    && pip install --no-cache-dir .

EXPOSE 8090

CMD ["uvicorn", "pdf_aas.main:app", "--host", "0.0.0.0", "--port", "8090"]
