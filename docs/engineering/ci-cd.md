# CI/CD

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

Official Data Products run GitHub Actions:

- Lint
- Unit tests
- Contract tests
- Data quality tests
- Compatibility tests
- Docker build

The Control Plane displays the latest result on **CI Quality Gate**.
Marketplace does not show CI status.

Unknown usually means Actions: Read-only is missing or GitHub is
unavailable. That is not a product failure.

How-to: [Read CI failures](../how-to/ci-failure.md).
