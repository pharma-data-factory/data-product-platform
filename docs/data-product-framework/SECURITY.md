# Security

## Authentication

Reuse Backstage user credentials. No new password store.
Service secrets stay in backend/env config.

## Authorization

Permissions (platform-common):

| Permission | Purpose |
| --- | --- |
| `data-product.view` | Descriptor / overview |
| `data-product.consume` | Query / stream |
| `data-product.viewQuality` | Quality metadata |
| `data-product.viewValidation` | Validation metadata |
| `data-product.admin` | Admin (PLATFORM_ADMIN) |

Granted via existing role sets — no parallel RBAC.

## Trust boundary

```text
Browser (no MQTT secrets)
   → Backstage session
   → Permission check
   → /consume/* backend
   → Optional upstream base URL (config)
```

Payloads are not logged indiscriminately.
