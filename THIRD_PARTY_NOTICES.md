# THIRD-PARTY NOTICES — DRAFT TEMPLATE

> **STATUS: DRAFT — NOT COUNSEL-APPROVED.**
> This file is a working template prepared for legal review. It does **not**
> satisfy the Apache-2.0 attribution obligations on its own and must not be
> treated as a binding notice. Counsel must verify every copyright line,
> complete the auto-generated dependency inventory, and approve this file
> before commercial distribution. Distribution remains gated by
> `LEGAL_DISTRIBUTION_STATUS` (currently `BLOCKED`).

This document lists third-party open-source software used by or distributed
with Nexora / Nexora. It supplements the repository `NOTICE`
file and `licenses/Apache-2.0.txt`, which remain the authoritative terms for
each component.

---

## 1. Backstage

- **Component:** Backstage (platform kernel / framework)
- **Version:** 1.53.0 (see `backstage.json`)
- **License:** Apache License 2.0
- **Upstream license text:** https://github.com/backstage/backstage/blob/master/LICENSE
- **Upstream NOTICE:** https://github.com/backstage/backstage/blob/master/NOTICE
- **Copyright / attribution:** The Backstage Authors. Originally created at
  Spotify AB; Backstage is now a Cloud Native Computing Foundation (CNCF)
  project.
- **Trademark:** "Backstage" is a trademark of The Linux Foundation. The
  Apache-2.0 license does not grant trademark rights. `[verify exact
  trademark notice wording with counsel]`

## 2. Eclipse BaSyx

- **Component:** Eclipse BaSyx AAS runtime / SDK (used by generated AAS data
  products)
- **License:** Apache License 2.0
- **Upstream:** https://github.com/eclipse-basyx/basyx-java-sdk
- **Copyright / attribution:** © Fraunhofer Institute. `[verify exact
  copyright line with counsel]`

## 3. Yarn (Berry)

- **Component:** Yarn package manager runtime (`.yarn/releases/yarn-4.13.0.cjs`)
- **License:** BSD-2-Clause
- **Upstream:** https://github.com/yarnpkg/berry

## 4. Full dependency inventory

The complete list of npm/Yarn dependencies (and their individual licenses and
notices) must be generated from `yarn.lock` and attached here. Every
dependency whose license requires a NOTICE or attribution must be listed.

> `[PLACEHOLDER]` Generate with the repository's supported license tooling
> (e.g. `yarn licenses list` or an approved notice generator) and paste the
> output below. Do not hand-maintain this list.

```text
[PLACEHOLDER — auto-generated dependency inventory]
```

---

## Review checklist for counsel

- [ ] Verify Backstage copyright and trademark notice wording.
- [ ] Verify Eclipse BaSyx copyright line.
- [ ] Generate and attach the full dependency inventory.
- [ ] Confirm this notice covers the Template Edition and generated Data
      Product artifacts, not only the Control Plane.
- [ ] Set `LEGAL_DISTRIBUTION_STATUS=APPROVED` only after final approval.
