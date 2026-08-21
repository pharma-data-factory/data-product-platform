# Docker

Owner: Golden Path Team  
Template: rest-equipment-data-product

```bash
docker build -t ${{ values.name }} .
docker compose up
```

The image must serve `/health` without Backstage.
