# Docker

Owner: Golden Path Team  
Template: mqtt-temperature-data-product

Build and run with the generated `Dockerfile` and `docker-compose.yml`.

```bash
docker build -t ${{ values.name }} .
docker compose up
```

The image must serve `/health` without Backstage.
