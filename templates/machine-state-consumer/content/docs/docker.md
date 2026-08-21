# Docker

```bash
docker build -t ${{ values.name }}:ci .
docker compose up --build
```

SQLite data is stored under `/app/data`.
