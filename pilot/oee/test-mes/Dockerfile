FROM python:3.12-slim

WORKDIR /app
COPY test_mes.py ./
RUN pip install --no-cache-dir fastapi uvicorn
EXPOSE 8090
CMD ["uvicorn", "test_mes:app", "--host", "0.0.0.0", "--port", "8090"]
