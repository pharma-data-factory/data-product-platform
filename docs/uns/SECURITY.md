# UNS Security Principles 1.0

## Goals

- Publisher identity
- Subscriber identity
- Topic ACL least privilege
- Environment isolation (simulation vs plant)
- No shared hardcoded credentials in source control

## Model Company v0.1

Local Mosquitto may allow anonymous connections for **synthetic / local only** (same pattern as `pilot/oee` and `uns/` brokers).

Documented remaining production requirements:

| Control | Production requirement |
| --- | --- |
| Authn | Username/password or mTLS; no anonymous |
| Authz | Topic ACLs per publisher/subscriber role |
| Transport | TLS |
| Secrets | Env / secret store — never committed |
| Isolation | Separate brokers or ACL namespaces per environment |

Backstage Control Plane continues to use existing auth + `modelCompany.*` permissions for UI/API. MQTT credentials are never exposed in the UNS Explorer.
