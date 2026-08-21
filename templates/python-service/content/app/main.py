from fastapi import FastAPI

from app.config import settings

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="${{ values.description }}",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "UP",
        "service": settings.service_name,
        "version": settings.service_version,
    }
