FROM python:3.12-slim

WORKDIR /app
COPY scenarios.py publish.py ./
RUN pip install --no-cache-dir paho-mqtt
ENTRYPOINT ["python", "publish.py"]
