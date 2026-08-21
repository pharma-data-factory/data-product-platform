# Troubleshooting

Owner: Golden Path Team  
Template: rest-equipment-data-product

| Symptom | What to check |
| --- | --- |
| Service will not start | `.env` from `.env.example`; Python 3.12 |
| Empty equipment list | `SOURCE_API_URL` or mock ingest |
| Contract tests fail | Payload vs `contracts/equipment-event.schema.json` |
| CI UNKNOWN in the portal | GitHub Actions permission, not a product defect |
| Duplicate equipment | Upsert is keyed on `equipmentId` |

See [Quality Rules](quality-rules.md) and [CI/CD](ci-cd.md).
