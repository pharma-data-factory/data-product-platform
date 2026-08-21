# Deployment

The generated product runs as a Docker image. Kubernetes is out of scope.

```bash
docker build -t ${{ values.name }} .
docker run --rm -p 8080:8080 ${{ values.name }}
```

Or:

```bash
docker compose up --build
```

GitHub Actions quality gate:

1. Lint
2. Unit tests
3. Contract tests
4. Data quality tests
5. Compatibility tests
6. Docker build

Compatibility tests fail CI when a breaking contract change would affect
an active consumer such as `temperature-dashboard-consumer` (`1.x`).
