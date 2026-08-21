FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY operations/health /deps/health
COPY operations/observability /deps/observability
COPY integration/rest-api /deps/rest-api
COPY integration/mqtt-consumer /deps/mqtt-consumer
COPY data/timeseries /deps/timeseries
COPY examples/machine-metrics /app

RUN pip install --no-cache-dir /deps/health /deps/observability /deps/timeseries \
    && pip install --no-cache-dir /deps/rest-api --no-deps \
    && pip install --no-cache-dir /deps/mqtt-consumer --no-deps \
    && pip install --no-cache-dir .

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
