# Developer Quick Start

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING

Canonical first-day path. Do not copy these steps onto other pages.

Target: authenticated portal in under 10 minutes. First generated Data
Product in under 20 minutes (local generate; GitHub publish is extra).

## 1. Credentials (keep them separate)

| Variable | Purpose | When |
| --- | --- | --- |
| `AUTH_GITHUB_CLIENT_ID` / `AUTH_GITHUB_CLIENT_SECRET` | Portal GitHub **user** login | Shared, Docker, staging, production, and any GitHub sign-in |
| `GITHUB_APP_ID` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_PRIVATE_KEY` | GitHub **App** repository publishing | `yarn start:github` Create |
| `catalog/org.yaml` User | Approved Catalog identity | Required except local Guest |

Copy `.env.example` to `.env`. Never commit `.env`.

Details: [GitHub setup](../github-setup.md).

## 2. Local single-user portal (< 10 minutes)

```bash
cd data-product-platform
yarn install
yarn start
```

Open http://localhost:3000 → Sign In → **Continue as Guest**.

Guest is a local Developer fallback (`data-product-developers`). Guest is
not Platform Admin and is absent from Docker, staging, and production.

Add yourself to `catalog/org.yaml` before using GitHub login.

## 3. Shared / Docker / pilot

GitHub OAuth is required. Guest is disabled.

```bash
docker compose up --build
```

Set `AUTH_GITHUB_*` in `.env`. Catalog Users must exist in `catalog/org.yaml`.
Compose service name is `control-plane`. Database default is
`pharma_data_factory`.

## 4. First Data Product (< 20 minutes)

1. Sign in as Developer or above.
2. Marketplace → **MQTT Temperature Data Product** (official Golden Path).
3. Create. For GitHub publishing use `yarn start:github`.
4. Generated service: `/health` and `/api/v1/quality`.
5. Catalog → Data Product detail → Contract → TechDocs → CI Quality Gate.

Python Microservice is a general service template, not this Golden Path.

Full journey: [Build Your First Data Product](first-data-product.md).
Controlled GitHub proof: [GitHub integration test](github-integration-test.md).
