# Build Your First Data Product

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: PLATFORM USER

Use **MQTT Temperature Data Product** unless your team assigned REST
Equipment. This is the first-day Developer Hub journey. The same steps
appear on `/developer`. Demo narrative: [demo-guide.md](../demo-guide.md).

> KEEP CORE SYSTEMS STANDARD.  
> INNOVATE THROUGH DATA PRODUCTS.

Public story: [`/platform/architecture`](/platform/architecture). Do not
duplicate that page here.

## Overview

| Step | Why | Action | Expected result | Common error | Learn more |
| --- | --- | --- | --- | --- | --- |
| 01 Sign In | Approved identity | Sign In → GitHub | Home with your name | Unknown users are denied | [Identity](../architecture/identity.md) |
| 02 Verify Developer role | Authorization | Check Home role | Create Data Product is visible | Viewer cannot create | [Identity](../architecture/identity.md) |
| 03 Open Marketplace | Discover | Sidebar → Marketplace | Certified Golden Paths listed | Catalog unavailable | [Getting started](getting-started.md) |
| 04 Select a CERTIFIED Golden Path | Reuse a certified template | Open MQTT Temperature | Contract and Create shown | Unauthorized create | [MQTT how-to](../how-to/mqtt-temperature.md) |
| 05 Configure Data Product | Name the product | Fill name, owner, repo | Review shows pharma-data-factory | Invalid name | [MQTT how-to](../how-to/mqtt-temperature.md) |
| 06 Create GitHub repository | Generate the Data Plane | Create | Success with GitHub link | GitHub App not installed | [GitHub](../github-setup.md) |
| 07 Clone repository | Work independently | `git clone` | README, CI, contracts present | Empty repo | [Local development](local-development.md) |
| 08 Start locally | Prove independence | Follow README | `/health` returns 200 | Missing MQTT or source URL | [Local development](local-development.md) |
| 09 Test API | Check the governed interface | Call documented API | Payload matches contract | Wrong service | [Contracts](../engineering/contracts.md) |
| 10 Run unit tests | Gate quality locally | `pytest` | Tests pass | Contract drift | [Quality](../engineering/quality.md) |
| 11 Push to GitHub | Trigger CI | Push branch | GitHub Actions starts | Workflows permission | [CI/CD](../engineering/ci-cd.md) |
| 12 Inspect CI Quality Gate | Quality gate | CI Quality Gate card | PASSED | UNKNOWN / FAILED | [Debug CI](../how-to/ci-failure.md) |
| 13 Open Data Product in Catalog | Discoverability | Data Products | Owner and versions visible | Register step skipped | [Catalog registration](../how-to/register-catalog.md) |
| 14 Inspect Data Contract | Consumer binding | Contract card | Version + compatibility | API entity missing | [Contracts](../engineering/contracts.md) |
| 15 Inspect Quality | Technical evidence | Quality / Compliance | Required checks listed | Not GxP | [Quality](../engineering/quality.md) |
| 16 Inspect Dependencies | Catalog topology | Dependencies card | Provides / Consumes / Depends On / Used By | Relations omitted | [Data Product Architecture](../architecture/data-product.md) |
| 17 Open TechDocs | Docs-as-code | Discover → Documentation | Product TechDocs | Missing techdocs-ref | [Publish TechDocs](../how-to/publish-techdocs.md) |

```mermaid
flowchart LR
  classDef navy fill:#0B1F3A,stroke:#0B1F3A,color:#ffffff
  classDef teal fill:#0D9488,stroke:#0D9488,color:#ffffff

  DEV[Developer] --> GP[Golden Path]
  GP --> GH[GitHub]
  GH --> CI[CI/CD]
  CI --> TEST[Tests]
  TEST --> DOCK[Docker]
  DOCK --> CAT[Catalog]
  CAT --> TD[TechDocs]

  class DEV,GP,GH navy
  class CI,TEST,DOCK,CAT,TD teal
```

## 01. Sign In

- **Why:** The Control Plane only works with an approved Catalog identity.
- **Action:** Open Sign In and continue with GitHub. Guest is local development only.
- **Expected result:** You land on Home with your display name and platform role.
- **Common error:** Unknown GitHub users are denied. Production requires a Catalog User.
- **Learn more:** [Identity & RBAC](../architecture/identity.md)

## 02. Verify Developer role

- **Why:** Certified Golden Paths can only be executed by Developer, Data Product Owner, or Platform Admin.
- **Action:** Check Home. Role should be Developer, Data Product Owner, or Platform Admin.
- **Expected result:** Create Data Product appears in Quick actions.
- **Common error:** Viewer can browse documentation but cannot create. Ask a Platform Admin to add you to `data-product-developers`.
- **Learn more:** [Identity & RBAC](../architecture/identity.md)

## 03. Open Marketplace

- **Why:** Certified Golden Paths are discovered here rather than invented ad hoc.
- **Action:** Open Marketplace from Home, Developer Hub, or the sidebar.
- **Expected result:** MQTT Temperature, REST Equipment, and OEE appear as certified Data Product Golden Paths. OEE commercial badge may still say FUTURE.
- **Common error:** If Marketplace is empty, catalog load failed. Retry or check backend logs.
- **Learn more:** [Getting started](getting-started.md) · platform route `/marketplace`

## 04. Select a CERTIFIED Golden Path

- **Why:** Start from a reviewed manufacturing template, not a blank repository.
- **Action:** Open MQTT Temperature Data Product. Use REST Equipment only if that is the assigned path.
- **Expected result:** The entry shows contract, certification, Golden Path documentation, and Create Data Product.
- **Common error:** Unauthorized means your role cannot execute Scaffolder templates.
- **Learn more:** [MQTT Temperature Data Product](../how-to/mqtt-temperature.md) · `/marketplace/mqtt-temperature-data-product`

## 05. Configure Data Product

- **Why:** Name, owner, and repository identity become Catalog metadata.
- **Action:** Fill Data Product Name, Owner, and GitHub Repository. Keep the default contract version unless you are changing a contract.
- **Expected result:** Review step lists repo owner `pharma-data-factory` and catalog registration.
- **Common error:** Invalid names fail template validation before GitHub is called.
- **Learn more:** [MQTT Temperature Data Product](../how-to/mqtt-temperature.md)

## 06. Create GitHub repository

- **Why:** The Golden Path generates source, tests, CI, Docker, contract, and catalog-info.
- **Action:** Create. Wait for `publish:github` and `catalog:register`.
- **Expected result:** Success page with repository and Data Product links.
- **Common error:** `No token available for host: github.com` means the GitHub App is not installed.
- **Learn more:** [GitHub setup](../github-setup.md)

## 07. Clone repository

- **Why:** The Data Product must run independently of the Control Plane.
- **Action:** `git clone` the created GitHub repository.
- **Expected result:** README, Dockerfile, `contracts/`, `docs/`, and `.github/workflows/ci.yml` are present.
- **Common error:** Empty repo usually means `publish:github` failed. Re-run Create after fixing the App install.
- **Learn more:** [Local development](local-development.md)

## 08. Start locally

- **Why:** Prove the Data Plane starts without Pharma Data Factory.
- **Action:** Follow the product README. Copy `.env.example` and start with Docker Compose or Python 3.12.
- **Expected result:** Health endpoint returns 200.
- **Common error:** Missing MQTT broker or `SOURCE_API_URL` fails startup. Use the values from `.env.example`.
- **Learn more:** [Local development](local-development.md)

## 09. Test API

- **Why:** Consumers bind to the governed product API, not the source-system schema.
- **Action:** Call `/health` and the product API documented in TechDocs.
- **Expected result:** JSON responses match the Data Contract fields.
- **Common error:** 404 on `/api/v1/...` usually means the service is not the generated Data Product.
- **Learn more:** [Data Contracts](../engineering/contracts.md)

## 10. Run unit tests

- **Why:** Contract and quality checks must pass before you push.
- **Action:** Run `pytest` in the repository.
- **Expected result:** Unit, contract, and quality tests pass.
- **Common error:** Schema failures mean the payload drifted from the contract. Do not skip tests.
- **Learn more:** [Quality](../engineering/quality.md)

## 11. Push to GitHub

- **Why:** GitHub Actions is the quality gate for every official Data Product.
- **Action:** Commit on a branch and push. Open a pull request if main is protected.
- **Expected result:** GitHub Actions workflow CI starts.
- **Common error:** Workflows permission missing on the GitHub App prevents pushing `ci.yml`.
- **Learn more:** [CI/CD](../engineering/ci-cd.md)

## 12. Inspect CI Quality Gate

- **Why:** The portal shows the latest GitHub Actions result. This is not GxP validation.
- **Action:** Open the Data Product in the portal and the CI Quality Gate card, or GitHub Actions.
- **Expected result:** PASSED after lint, tests, and Docker build.
- **Common error:** UNKNOWN means Actions read permission or GitHub is unavailable. FAILED lists stages.
- **Learn more:** [Debug CI](../how-to/ci-failure.md)

## 13. Open Data Product in Catalog

- **Why:** `catalog-info.yaml` is what makes the product discoverable.
- **Action:** Open Data Products and the new product, or Catalog.
- **Expected result:** Owner, domain, contract version, and certification are visible.
- **Common error:** Missing entity: `catalog:register` did not run or the location was not processed.
- **Learn more:** [Catalog registration](../how-to/register-catalog.md) · `/data-products`

## 14. Inspect Data Contract

- **Why:** Consumers bind to the versioned API, not source internals.
- **Action:** Open Contract on the Data Product page.
- **Expected result:** Contract name, version, and compatibility status.
- **Common error:** Not registered means the API entity was not created. Check `catalog-info.yaml` `providesApis`.
- **Learn more:** [Data Contracts](../engineering/contracts.md)

## 15. Inspect Quality

- **Why:** Required checks and platform versions are the technical evidence for the product.
- **Action:** Open Quality / Platform Compliance on the product page.
- **Expected result:** Required checks, standard, SDK, and template versions.
- **Common error:** This is not GxP validation. Missing versions mean catalog annotations were omitted.
- **Learn more:** [Quality](../engineering/quality.md) · [Data Product Standard](../engineering/standard.md)

## 16. Inspect Dependencies

- **Why:** Catalog relationships (Provides, Consumes, Depends On, Used By) keep topology explicit.
- **Action:** Open Dependencies on the Data Product page.
- **Expected result:** Related APIs and components are listed.
- **Common error:** Empty relations usually mean `providesApis`, `consumesApis`, or `dependsOn` were omitted from `catalog-info.yaml`.
- **Learn more:** [Data Product Architecture](../architecture/data-product.md)

## 17. Open TechDocs

- **Why:** Product documentation is versioned with the repository, not a second wiki.
- **Action:** Open Documentation from Discover on the product page.
- **Expected result:** TechDocs for that Data Product following the Golden Path documentation standard.
- **Common error:** Missing `techdocs-ref` or `mkdocs.yml` leaves Documentation unavailable.
- **Learn more:** [Golden Path documentation standard](../engineering/golden-path-documentation.md), [Publish TechDocs](../how-to/publish-techdocs.md)
