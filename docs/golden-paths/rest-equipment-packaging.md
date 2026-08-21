# REST Equipment customer packaging manifest

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Technical inventory of what Create generates for
`golden-path.rest-equipment`. This is not a license and not a GxP claim.

**LEGAL DISTRIBUTION STATUS:** driven by
`commercial.legalDistributionStatus` (default **BLOCKED**).

Customer handoff is blocked while status is BLOCKED. Internal Create may
still generate this tree for engineering.

## Generated tree (`templates/rest-equipment-product/content/`)

| Area | Paths |
| --- | --- |
| Application source | `app/main.py`, `app/config.py`, `app/models.py`, `app/source.py`, `app/store.py`, `app/quality.py`, `app/compatibility.py` |
| Vendored `dataprod` SDK | `dataprod/__init__.py`, `dataprod/contracts.py`, `dataprod/quality.py`, `dataprod/metadata.py`, `dataprod/compatibility.py`, `dataprod/compatibility-policy.json` |
| Contracts | `contracts/equipment-event.schema.json`, `compat/published.schema.json`, `compat/consumers.json` |
| Tests | `tests/test_*.py`, `tests/conftest.py` |
| Dockerfile | `Dockerfile`, `docker-compose.yml`, `.dockerignore` |
| CI workflow | `.github/workflows/ci.yml`, `.github/workflows/data-product-quality.yml` |
| TechDocs | `mkdocs.yml`, `docs/*.md` |
| README | `README.md`, `catalog-info.yaml` |
| Dependencies | `pyproject.toml` — FastAPI, Uvicorn, Pydantic, pydantic-settings, httpx, jsonschema; dev: pytest, ruff |

## Third-party components (names only)

Do not treat this list as `THIRD_PARTY_NOTICES`. Counsel must approve
notice text (G2/G5). Runtime packages declared in `pyproject.toml`:

- fastapi
- uvicorn
- pydantic / pydantic-settings
- httpx
- jsonschema

Python 3.12+ and the container base image are additional distribution
surfaces once a customer image is published.

## Files not present (blocked until counsel)

See [generated placeholders](legal/generated-placeholders.md).
