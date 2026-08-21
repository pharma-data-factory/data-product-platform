# UNS MQTT Setup

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Environment:

```text
UNS_MQTT_HOST
UNS_MQTT_PORT
UNS_MQTT_USERNAME
UNS_MQTT_PASSWORD
UNS_ROOT_TOPIC
```

Local Compose starts Eclipse Mosquitto with anonymous access for
development. Production brokers must require credentials and must not
allow anonymous clients. TLS and topic-level authorization are planned;
this MVP keeps secrets in environment variables only.
