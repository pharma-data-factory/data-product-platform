FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TIMESERIES_SQLITE_PATH=/app/data/oee.db

COPY vendor/health /deps/health
COPY vendor/observability /deps/observability
COPY vendor/rest-api /deps/rest-api
COPY vendor/rest-source /deps/rest-source
COPY vendor/mqtt-consumer /deps/mqtt-consumer
COPY vendor/timeseries /deps/timeseries
COPY pyproject.toml README.md ./
COPY app ./app
COPY dataprod ./dataprod
COPY contracts ./contracts
COPY compat ./compat
COPY capabilities.yaml ./
COPY examples ./examples

RUN pip install --no-cache-dir /deps/health /deps/observability /deps/timeseries \
    && pip install --no-cache-dir /deps/rest-api --no-deps \
    && pip install --no-cache-dir /deps/rest-source --no-deps \
    && pip install --no-cache-dir /deps/mqtt-consumer --no-deps \
    && pip install --no-cache-dir . \
    && mkdir -p /app/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
