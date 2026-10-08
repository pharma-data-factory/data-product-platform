FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV SQLITE_PATH=/app/data/equipment.db

COPY pyproject.toml README.md ./
COPY app ./app
COPY dataprod ./dataprod
COPY contracts ./contracts

RUN pip install --no-cache-dir . \
    && mkdir -p /app/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
