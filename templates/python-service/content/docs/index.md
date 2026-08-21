# ${{ values.name }}

${{ values.description }}

## Ownership

- Owner: `${{ values.owner }}`
- Version: `${{ values.version }}`
- Template: `python-microservice`

## API

### `GET /health`

```json
{
  "status": "UP",
  "service": "${{ values.name }}",
  "version": "${{ values.version }}"
}
```
