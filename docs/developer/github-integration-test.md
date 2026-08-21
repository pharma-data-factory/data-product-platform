# Controlled GitHub integration test

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING

Automated CI does not publish to GitHub. Use this checklist in a
controlled environment with a GitHub App installed on a test org.

1. `yarn start:github` with `AUTH_GITHUB_*` and `GITHUB_APP_*` populated.
2. Sign in as a Catalog User in `data-product-developers`.
3. Marketplace → MQTT Temperature → Create into the test org.
4. Confirm the repository exists and GitHub Actions ran.
5. Confirm Catalog registration and Data Product detail, Contract,
   TechDocs, and CI Quality Gate.

Do not require AWS Marketplace. Do not use production customer orgs.

Observed 2026-08-21: the installed GitHub App can create repositories and
push contents. **Actions Read-only is missing**, so workflow status is
`UNKNOWN` to the Control Plane even if Actions still execute. Grant
Actions Read-only before treating CI Quality Gate as a pass.
