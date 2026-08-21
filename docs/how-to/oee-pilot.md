# OEE Pilot Integration Proof — developer sequence

Owner: Golden Path Team  
Last reviewed: 2026-08-21  
Audience: PLATFORM USER  
Version: 1.0.0

Run a generated OEE Data Product against Test MES and a local Mosquitto
broker. This is a **PILOT / TEST** fixture. It is not GxP validation and
not a plant connection.

Do not edit generated source. Configure `.env` only.

## Sequence

1. **Create OEE** in Marketplace as `pilot-oee-line-01`, or generate the
   same artifact locally:

   ```powershell
   python data-product-platform/pilot/oee/generate.py
   ```

2. **Clone** the GitHub repo if Create published it. For the local proof,
   use `data-product-platform/pilot/oee/generated/pilot-oee-line-01`.

3. **Configure `.env`** from the generated `.env.example`:

   ```
   MQTT_HOST=127.0.0.1
   MQTT_PORT=41883
   SOURCE_API_URL=http://127.0.0.1:18090/api/v1/production-context/filler-01
   EQUIPMENT_ID=filler-01
   DEFAULT_WINDOW=custom
   ```

4. **Start the pilot environment** (Test MES + Mosquitto + OEE):

   ```powershell
   cd data-product-platform/pilot/oee
   python generate.py
   docker compose up --build -d mosquitto test-mes oee
   ```

5. **Publish a scenario** (canonical OEE 1.0 contracts only):

   ```powershell
   python publisher/publish.py --broker 127.0.0.1 --port 41883 --scenario PERFECT
   ```

6. **Inspect OEE**:

   `GET http://127.0.0.1:18080/api/v1/oee/filler-01?window=custom&from=2026-08-20T08:00:00Z&to=2026-08-20T09:00:00Z`

   Expected PERFECT: Availability, Performance, Quality, OEE all `1.0`.

7. **Inspect quality**: `GET http://127.0.0.1:18080/api/v1/quality`

8. **Run tests**:

   ```powershell
   cd data-product-platform/templates/oee-data-product/content
   pytest
   cd ../../../pilot/oee
   pytest
   ```

Stop the Control Plane after the product is running. Test MES, Mosquitto,
and OEE continue independently.

Anonymous Mosquitto is **pilot-local only**. A plant broker requires
credentials, TLS, and authorization.

GitHub Actions live publish: [OEE GitHub integration test](../developer/oee-github-integration-test.md).
If that procedure was not executed, the status is `GITHUB_LIVE_PROOF_NOT_RUN`.
