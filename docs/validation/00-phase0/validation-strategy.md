# Validation Strategy — CSV Phase 0 (PROPOSED)

| Field | Value |
| --- | --- |
| Document ID | PDF-CSV-P0-ST-001 |
| Status | PROPOSED strategy — not executed validation |
| Product validation status | **NOT_VALIDATED** |
| Date | 2026-08-23 |

---

## 1. Layered model

```text
Layer 4  Customer / site-specific configuration & deployment
Layer 3  Generated Data Product instances (workloads)
Layer 2  Reusable Golden Paths / platform components (qualified packages)
Layer 1  Platform Core / Control Plane  ← Baseline 0.1 candidate
```

### Layer 1 — Platform Core

**Object:** Authenticated Control Plane (UI/API), catalog engine, scaffolder engine, permission policy, entitlements gates, core persistence, technical GitHub integration, discovery UIs (marketplace/data-product metadata).

**Evidence focus:** Identity, access control, configuration management, scaffolder engine behavior, catalog integrity (non-sample), technical audit of create authorization, IQ of frozen deployment.

### Layer 2 — Golden Paths / reusable components

**Object:** Official template **content** and Wave-1 platform-components libraries.

**Evidence focus:** Template parameters, generated structure, content unit/integration tests, container build of template, documented limitations.

**Relation to Layer 1:** Inherits “scaffolder can run registered templates under authz” from Layer 1; does **not** inherit GxP fitness of generated runtime.

### Layer 3 — Generated Data Products

**Object:** A specific repository/runtime created from a GP for a business use case.

**Evidence focus:** Fit-for-purpose testing, deployment IQ/OQ for that instance, data integrity of its records, integration to OT/IT sources.

**Inheritance:** May reference Layer 2 package version + Layer 1 platform version used to scaffold; must still perform **delta** testing for configuration and intended GxP use.

### Layer 4 — Site configuration

**Object:** Customer IdP mappings, entitlement maps, network, secrets, SOPs.

**Evidence focus:** Site IQ, procedural controls, training.

---

## 2. What can potentially be inherited vs re-tested

| Evidence type | Inherit? | Re-test when |
| --- | --- | --- |
| Platform permission unit tests | Supportive only | Policy code changes; always confirm in OQ scenarios |
| Platform IQ of tagged build | Layer 1 | New baseline tag / infra change |
| Official GP content pytest | Layer 2 | Template version change |
| “Product is GxP validated because scaffolded” | **Never** | — |
| Site deployment of DP | Never fully inherit | Each site/instance |
| GitHub SaaS availability | Not inherited as validated | Supplier/service review |

---

## 3. Strategy goals

1. Maximize reuse of Layer 1/2 evidence.  
2. Keep Layer 3 delta small and explicit.  
3. Prevent scope explosion from experimental plugins.  
4. Preserve **NOT_VALIDATED** until formal CSV lifecycle completes under change control.

---

## 4. Explicit non-goals of this document

- Does not execute IQ/OQ/UAT.  
- Does not approve GAMP category.  
- Does not replace existing `validation/baseline` requirements package; it complements configuration Phase 0.
