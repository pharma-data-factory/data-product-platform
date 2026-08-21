# Local development

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: INTERNAL ENGINEERING  
Version: MVP 1.1

## Control Plane

Canonical commands: [Developer Quick Start](quick-start.md).

Repository publishing needs `yarn start:github` and a filled `.env`.
See [GitHub setup](../github-setup.md).

## Data Product (Data Plane)

Generated products run without Backstage.

1. Clone the GitHub repository created by the Golden Path.
2. Copy `.env.example` to `.env`.
3. Start with Docker Compose or Python 3.12 as documented in that repo.
4. Confirm `/health`.
5. Run `pytest`.
6. Build the Docker image with the generated Dockerfile.

MQTT Temperature needs a broker. REST Equipment needs `SOURCE_API_URL`.
Do not point these products at production ERP/MES databases.

## Run tests and Docker

How-to pages:

- [MQTT Temperature](../how-to/mqtt-temperature.md)
- [REST Equipment](../how-to/rest-equipment.md)
- [CI failures](../how-to/ci-failure.md)
