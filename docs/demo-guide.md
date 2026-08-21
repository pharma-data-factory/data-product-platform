# Pharma Data Factory — Developer demo guide

This is the reference developer journey for MVP 1.1. Use **MQTT Temperature
Data Product** as the primary Golden Path. REST Equipment remains available
and is not the main demo.

Do not treat Python Microservice, MQTT Connector, or Node.js Microservice as
the reference Data Product demo.

Estimated time: 8 minutes.

Required before the demo:

- Platform running with `yarn start:github`
- GitHub OAuth login configured (`AUTH_GITHUB_*`)
- GitHub App installed on `pharma-data-factory` with **Actions: Read-only**
- Signed in as a user in `data-product-developers` (Developer)

## Reference journey

Public Landing → Sign In → Authenticated Home → Marketplace → MQTT Temperature
Data Product → Create → GitHub Repository → GitHub Actions → Catalog
registration → Data Product Detail → Data Contract → Quality → Compatibility →
Dependencies → Catalog Graph → Documentation → Platform Compliance

## Script

### 1. Public Home (about 1 minute)

Open the public landing. Read the hero (**Keep the core standard**), then
**Why**, **How it works**, and the OEE proof. Optionally open
**Explore Architecture** (`/platform/architecture`) or **How developers build**.

Expected:

- Core systems stay standard (ERP, MES, LIMS, EWM)
- Home does not lecture AAS, UNS, or the component registry
- OEE is shown as an independent Data Product, not MES customization
- MQTT Temperature and REST Equipment are CERTIFIED proof cards
- Closing commercial honesty: Template is AVAILABLE FOR PILOT, Platform is PLANNED, SaaS is FUTURE
- Architecture page keeps the system of record, Data Product, and control plane as distinct layers
- Developer architecture explains Marketplace → Create → GitHub → Catalog

### 2. Sign in

Click **Sign In** → **Continue with GitHub**.

Expected:

- GitHub authenticates the user
- Developer role resolves from catalog group `data-product-developers`
- Guest is not offered in production

### 3. Role-aware Home

Expected sections:

- **Quick actions** — Create Data Product (primary), Explore Marketplace,
  Browse Data Products, Search Documentation
- **My Data Products**
- **Recent activity**
- **Quality & CI**
- **Platform updates**

Sample catalog entities show a **SAMPLE** label. They are not generated
GitHub repositories.

### 4. Marketplace

Open **Explore Marketplace**. Filter to Data Products.

Expected:

- MQTT Temperature Data Product is listed
- REST Equipment is listed as a second certified path
- Create is available to Developer

### 5. Select MQTT Temperature

Open MQTT Temperature Data Product.

Expected before create:

- Certified Golden Path
- MQTT
- Data Contract
- Quality Gate
- CI/CD
- TechDocs
- Fields explained as Data Product Name, Description, Owner, Domain,
  GitHub Repository

### 6. Create a Data Product

Click **Create Data Product**. Complete:

- Data Product Name, for example `cold-room-temperature`
- Description
- Owner (user or group)
- MQTT topic (default is acceptable)
- GitHub Repository name (created in `pharma-data-factory`)

Click create. Do not change code or configuration during the demo.

### 7. Generated GitHub repository

On success the page shows **Data Product created** with the product name and
repository.

Expected next actions:

- View Data Product
- Open Repository
- View CI Pipeline
- Open Documentation
- View Data Contract

Open the repository. It should exist under
`github.com/pharma-data-factory/<name>`.

### 8. CI quality gate

From success, open **View CI Pipeline**, then return to the Data Product.

Expected CI Quality Gate values from the latest GitHub Actions workflow:

- PASSED
- FAILED
- RUNNING
- CANCELLED
- UNKNOWN

UNKNOWN means the GitHub App cannot read Actions (missing **Actions:
Read-only**) or GitHub is unavailable. That is not a product quality failure.

Reference repository used in earlier demos:
`pharma-data-factory/cold-room-temperature`.

### 9. Data Contract

On Data Product detail, open **Contract**.

Expected: contract name/version and a path to the contract.

### 10. Quality

Expected: quality status and required checks on the Data Product page.
This is technical platform status, not GxP validation.

### 11. Dependencies

Expected: Provides, Consumes, Depends On, Used By.

### 12. Documentation

Open **Documentation** (TechDocs) from Discover.

Expected: generated docs for the Data Product.

### 13. Platform Compliance

Open **Platform Compliance**.

Expected: standard, SDK, template, contract versions and certification.
This is technical platform compliance only.

## Acceptance checklist

The reference demo passes only when all of the following are true without
manual code or config changes during the session:

- [ ] User can authenticate
- [ ] Developer role is resolved
- [ ] Marketplace is accessible
- [ ] Certified MQTT Temperature template can be selected
- [ ] Data Product can be created
- [ ] GitHub repository is created
- [ ] CI workflow starts
- [ ] Catalog entity becomes discoverable
- [ ] Data Product detail renders
- [ ] Contract is discoverable
- [ ] Quality information renders
- [ ] Dependencies render
- [ ] Documentation is reachable
- [ ] Platform compliance renders

## GitHub App permission for real CI

The publishing GitHub App must include:

| Permission | Access |
| --- | --- |
| Actions | Read-only |

Do not change GitHub permissions automatically. If Actions is missing, the
CI Quality Gate stays UNKNOWN.

See [github-setup.md](github-setup.md) for the full permission set.
