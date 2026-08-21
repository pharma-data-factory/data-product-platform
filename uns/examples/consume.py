"""Consume accepted UNS events from the local service."""

import json

import httpx

response = httpx.get("http://localhost:8080/api/v1/events", timeout=10.0)
response.raise_for_status()
print(json.dumps(response.json(), indent=2))
