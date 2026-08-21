# MQTT Consumer

Owner: Platform Team  
Status: CERTIFIED  
Version: 1.0.0

Generic MQTT subscribe/reconnect client. Aligns conceptually with Unified
Namespace. Does not copy MQTT Temperature business logic and does not
implement UNS topic governance.

```
MQTT_HOST=
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=
MQTT_CLIENT_ID=
MQTT_KEEPALIVE=30
MQTT_TLS_ENABLED=false
MQTT_RECONNECT_MIN_DELAY=1
MQTT_RECONNECT_MAX_DELAY=30
```

TLS is a configuration seam (`MQTT_TLS_ENABLED`). Credentials stay in the
environment.

Python package: `pdf-mqtt-consumer`.

## Security

`MQTT_USERNAME` / `MQTT_PASSWORD` are secrets. TLS is optional
(`MQTT_TLS_ENABLED`). Do not log passwords.
