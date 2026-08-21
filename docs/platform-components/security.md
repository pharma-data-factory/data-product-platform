# Platform Component Security Limitations

Owner: Platform Team  
Last reviewed: 2026-08-20  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Lightweight technical review of Wave 1 components. This is not a GxP
validation package and does not introduce PKI, Vault, or enterprise IAM.

## Controls present

- Secrets only via environment / configuration (`.env.example` has empty values)
- Observability redacts credential-like field names (`password`, `token`, `secret`, `authorization`, `api_key`)
- REST Source does not log tokens; timeout 0.1–60s; retries 0–5
- MQTT password is not logged; TLS is a configuration seam; reconnect delay is bounded and configurable
- REST API validates public request bodies; unhandled errors return a generic 500
- Time-Series SQLite path is configurable (`TIMESERIES_SQLITE_PATH`)
- AAS connectivity mappings reject credential-like values; they identify endpoints only
- No hard-coded production credentials

## Remaining production gaps (not in this wave)

- No Vault / secret manager
- No PKI or mutual TLS management
- No enterprise IAM / customer SSO
- MQTT TLS client certificates are not a first-class settings object
- SQLite is a local file; not a multi-instance durable store
- In-process metrics are not shipped to Prometheus, OpenTelemetry, or Grafana
- Default MQTT topic `#` is generic; products must set a specific topic
- Empty `MQTT_PASSWORD` / `SOURCE_API_TOKEN` is allowed so local broker-free tests work; production must set credentials when the remote requires them

None of these gaps is a Wave 1 certification blocker. They are production
hardening items for a later platform edition.

See the [Certification Checklist](certification-checklist.md).
