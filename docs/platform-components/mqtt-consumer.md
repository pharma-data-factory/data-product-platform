# MQTT Consumer

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Generic connect, subscribe, reconnect, message-handler callback, TLS
configuration seam, health state, and observability hooks.

Does not copy MQTT Temperature business logic and does not implement
Unified Namespace topic governance. UNS may adopt this client in a future
migration; the working UNS runtime is not refactored in this wave.

```
MQTT_HOST=
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_TOPIC=
MQTT_CLIENT_ID=
```

Catalog `dependsOn`: Health, Observability.

## Error behavior

Connect failure marks health `DOWN` and re-raises. Disconnect marks
`connected=false` and health `DOWN` with detail `disconnected`. Handler
exceptions are swallowed, recorded on `last_error`, and do not crash the
loop. Reconnect delay is configurable
(`MQTT_RECONNECT_MIN_DELAY` / `MQTT_RECONNECT_MAX_DELAY`, max 300s).

## Security

`MQTT_USERNAME` / `MQTT_PASSWORD` stay in the environment and are not
logged. TLS is optional (`MQTT_TLS_ENABLED`, `MQTT_TLS_CA_CERTS`). There
is no default production password.

Anonymous Mosquitto (`allow_anonymous true` in `uns/broker/mosquitto.conf`
and Golden Path local compose) is **LOCAL DEVELOPMENT only**.

Pilot with an external broker must supply credentials and enable TLS.
Topic authorization, client certificates, and PKI are plant/broker
concerns; this component exposes a TLS CA seam only. Do not build PKI
in the platform.

Reconnect is bounded (`MQTT_RECONNECT_MIN_DELAY` /
`MQTT_RECONNECT_MAX_DELAY`, max 300s). Empty host disables the consumer.
