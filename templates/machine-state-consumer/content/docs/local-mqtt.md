# Local MQTT Development

1. Start Unified Namespace: `cd uns && docker compose up --build`
2. Set `MQTT_HOST=localhost` and `MQTT_TOPIC=pharma/+/+/+/+/machine/state`
3. Start this product
4. Publish a `machine-state-event` envelope to MQTT
5. `GET /api/v1/machines/{equipmentId}`

No MES or PLC is required.
