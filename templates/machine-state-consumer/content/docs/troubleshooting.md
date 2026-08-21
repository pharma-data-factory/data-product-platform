# Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `400` on POST | Envelope, contract, or payload schema failed |
| MQTT idle | `MQTT_HOST` is empty |
| Stale state | Older timestamp was ignored as out-of-order |
| Duplicate 200 | Same `eventId` already processed |
