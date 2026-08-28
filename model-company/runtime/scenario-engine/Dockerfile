FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

ENV MODEL_COMPANY_FACTORY=/factory/model-pharma.yaml
ENV MODEL_COMPANY_STATE=/data/runtime-state.json

EXPOSE 8091
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8091"]
