# Model Company Runtime

Separate Docker Compose stack for Customer Zero simulation.

```bash
cd model-company/runtime
docker compose up --build
```

- Mosquitto: `localhost:41884`
- Scenario engine REST: `http://127.0.0.1:18091/health`

Point Golden Path products at this broker/topics (`model-company/...`) after scaffolding — do not duplicate OEE/Temperature logic here.
