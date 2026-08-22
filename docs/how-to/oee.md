# Create OEE Data Product

Owner: Golden Path Team  
Last reviewed: 2026-08-21  
Audience: PLATFORM USER  
Version: 1.0

Product TechDocs are generated with the repository. This page is the
Control Plane journey only.

Status: **CERTIFIED** (technical platform status only, not GxP).
Commercial availability: **FUTURE**.

## Create

1. Sign in as Developer or above.
2. Open Marketplace → **OEE Data Product**.
3. Enter Name, Description, Owner, System, Site/Area/Line, Equipment Identifier, Default Window (`HOUR` / `SHIFT` / `ORDER` / `CUSTOM`), MQTT machine-state and counter topics, and the production-context URL **variable name**. The wizard does not ask you to design OEE formulas.
4. Create Data Product. Keep repo owner `pharma-data-factory`.
5. Wait for GitHub publish and catalog registration.
6. Clone the repository. Copy `.env.example` to `.env`. Set `MQTT_HOST` and `SOURCE_API_URL` locally. Never commit secrets.
7. Install vendor Wave 1 packages and `pip install -e ".[dev]"`.
8. Run `uvicorn app.main:app --port 8080`.
9. `python examples/simulate.py --scenario A`
10. Open `GET /api/v1/oee/{equipmentId}`, `GET /api/v1/losses`, and `GET /api/v1/quality`.
11. `pytest` then push. CI runs the quality gate. Catalog, contract, and TechDocs follow registration.

Stop Backstage after the product is running. The OEE process continues to ingest, calculate, store, and serve.

Local integration proof (Test MES + Mosquitto): [OEE Pilot Integration](oee-pilot.md).


First-day journey: [Build Your First Data Product](../developer/first-data-product.md).
