# Security quality gate

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: MVP 1.1

Official Data Product Golden Path CI includes a **Security scan** step
that runs `pip-audit` against installed Python dependencies.

## What it proves

- Known Python package CVEs reported by `pip-audit` fail the job.

## What it does not prove

- GxP validation
- Container image hardening
- Secret scanning of the repository
- Absence of all vulnerabilities
- Network, IAM, or runtime security of a deployed product

Node.js Microservice uses `npm audit --audit-level=high`. Unified
Namespace currently uses `pip check` (dependency consistency, not a CVE
database).
