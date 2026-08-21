# Golden Path documentation standard

Owner: Golden Path Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Every official production Golden Path must publish TechDocs with these
sections. Product TechDocs live in the generated repository. The
Developer Hub links to them; it does not copy them.

| Section | Purpose |
| --- | --- |
| Overview | What the product is and who owns it |
| Architecture | Source → ingest → contract → API |
| Prerequisites | Tools, broker/source, roles |
| Create | Marketplace → configure → GitHub |
| Configuration | Environment variables from `.env.example` |
| Local Development | Run without Backstage |
| API | Health and product endpoints |
| Data Contract | Schema and version |
| Quality Rules | Required checks |
| Compatibility | Consumer/matrix notes |
| Testing | pytest commands |
| CI/CD | GitHub Actions stages |
| Docker | Image and compose |
| Deployment | How the service is run |
| Operations | Health, logs, quality endpoint |
| Troubleshooting | Common failures |
| Release Notes | Template/product changes |

MQTT Temperature and REST Equipment already ship Overview through Release
Notes plus the additional sections above. Do not duplicate those pages in
the Control Plane docs. Hub how-tos only describe the platform journey.
