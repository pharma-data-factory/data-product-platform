# UNS Troubleshooting

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: PLATFORM USER  
Version: 1.0.0

| Symptom | Likely cause |
| --- | --- |
| GitHub 404 on OAuth | Unrelated to UNS. Check portal login. |
| `400` on `/api/v1/events` | Topic, envelope, or payload schema failed |
| MQTT connected false | `UNS_MQTT_ENABLED` is false or broker is down |
| Duplicate ignored | Same `eventId` already stored |
| Topic root mismatch | `UNS_ROOT_TOPIC` does not match the first segment |

Check `GET /health` and `GET /api/v1/metrics`.
