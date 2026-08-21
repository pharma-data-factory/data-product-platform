# Controlled OEE GitHub integration test

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING

Status: **GITHUB_LIVE_PROOF_NOT_RUN**

Automated CI does not publish an OEE Data Product to GitHub. Do not fake
a live Actions pass.

When a controlled GitHub test organization is available:

1. `yarn start:github` with `AUTH_GITHUB_*` and `GITHUB_APP_*` populated.
2. Sign in as a Catalog User in `data-product-developers`.
3. Marketplace → OEE Data Product → Create `pilot-oee-line-01` into the
   test org. Keep owner `pharma-data-factory`.
4. Confirm the repository exists.
5. Confirm GitHub Actions ran: Lint, Unit, Contract, Quality,
   Compatibility, Security Scan, Docker Build.
6. Confirm Catalog registration: Data Products, contract APIs,
   dependencies, Catalog Graph, TechDocs, CI Quality Gate.
7. Mark the entity **PILOT / TEST**. It is not official template
   certification.

Do not require AWS Marketplace. Do not use production customer orgs.

Shared GitHub App checklist: [github-integration-test.md](github-integration-test.md).
If Actions Read-only is missing, workflow status is `UNKNOWN` even when
Actions still execute.
