# ${{ values.title }}

${{ values.description }}

## Ownership

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Domain: `${{ values.domain }}`
- Lifecycle: `${{ values.lifecycle }}`
- Version: `${{ values.version }}`
- Template: `nodejs-microservice`

## API

### `GET /health`

```json
{
  "status": "UP",
  "service": "${{ values.name }}",
  "version": "${{ values.version }}"
}
```

### `GET /v1/info`

Returns service metadata used by the Data Product catalog.

## Local development

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Docker

```bash
docker compose up --build
```

## Data product metadata

| Field | Value |
| --- | --- |
| Source systems | ${{ values.sourceSystems }} |
| Interfaces | ${{ values.interfaces }} |
| Data contracts | ${{ values.dataContracts }} |
| Dependencies | ${{ values.dependsOn }} |
| Deployment | Docker Compose |
| Certification | DEVELOPMENT |
