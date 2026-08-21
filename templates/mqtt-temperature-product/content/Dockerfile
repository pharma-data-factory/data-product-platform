FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV SQLITE_PATH=/app/data/temperatures.db

COPY pyproject.toml README.md ./
COPY app ./app
COPY dataprod ./dataprod
COPY contracts ./contracts

RUN pip install --no-cache-dir . \
    && mkdir -p /app/data

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
