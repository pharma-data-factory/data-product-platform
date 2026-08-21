# Connectivity Mapping

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Each property may map to an operational endpoint:

| Field | Purpose |
| --- | --- |
| protocol | MQTT, REST, OPC_UA, FILE_STREAM; KAFKA reserved |
| topic | UNS / MQTT topic reference |
| endpoint | REST or other URL without credentials |
| contract | Contract name |
| contractVersion | SemVer |

Example:

AAS property `speed` on `filler-01` maps to

`pharma/basel/packaging/line-01/filler-01/speed/value`

Secrets (passwords, tokens, private keys) are rejected. TLS, PKI,
enterprise IAM, secret management, and a GxP audit trail are **not**
implemented.
