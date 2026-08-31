# PORTAL RUNTIME & UI VERIFICATION REPORT

**Date:** 2026-08-28
**Baseline:** `BACKSTAGE_FULL_RUNTIME_RECOVERY_COMPLETE_WITH_CONDITIONS`
**Mode:** Browser-execution + user-journey verification (read-only; no RBAC switch, no redesign, no
functionality changes, no Golden Path / Backstage Core changes).
**Verdict:** **PORTAL_RUNTIME_UP — UI_JOURNEY_VERIFICATION_COMPLETE_WITH_CONDITIONS**

Evidence classifications: `RUNTIME_EXECUTED`, `BROWSER_EXECUTED`, `CODE_INSPECTED`, `NOT_RUN`.

---

## 1. PORTAL RUNTIME STATUS (RUNTIME_EXECUTED)

| Surface | URL | Result |
|---|---|---|
| Frontend (SPA shell) | `http://localhost:3000` | HTTP 200 (`text/html`, 9155 bytes) |
| Backend readiness | `http://localhost:7007/.backstage/health/v1/readiness` | HTTP 200 `{"status":"ok"}` |
| Backend liveness | `http://localhost:7007/.backstage/health/v1/liveness` | HTTP 200 `{"status":"ok"}` |
| Authorization Registry health | `http://localhost:7007/api/authorization-registry/health` | HTTP 200 `{"status":"ok"}` |
| Backend process | PID 34068 (port 7007) | listening |
| Frontend process | PID 32888 (port 3000, `[::1]`) | listening |

Frontend is bound to IPv6 `::1` only (probe `127.0.0.1` → ECONNREFUSED; `localhost`/`[::1]` → 200).

## 2. BROWSER UI / USER-JOURNEY VERIFICATION (BROWSER_EXECUTED)

Playwright + Chromium (headless) executed against `http://localhost:3000`. **0 page errors** (uncaught
exceptions). 11 console messages are all Material-UI `findDOMNode` deprecation **warnings** (cosmetic,
non-blocking).

| Route | HTTP | Renders actual plugin UI | Observed content |
|---|---|---|---|
| `/` (Home) | 200 | ✅ (home page) | Nexora marketing landing ("DATA PRODUCTS. BUILT FOR LIFE SCIENCE…") |
| `/model-company` | 200 | ✅ | Model Company plugin UI ("SYNTHETIC \| NON-GXP \| NEXORA MODEL PHARMA \| Factory Operations View…") |
| `/catalog` | 200 | ❌ falls through | marketing landing page (NOT Backstage Catalog) |
| `/create` | 200 | ❌ falls through | marketing landing page (NOT Scaffolder/Create) |
| `/data-products` | 200 | ❌ falls through | marketing landing page |
| `/marketplace` | 200 | ❌ falls through | marketing landing page |
| `/urs-composer` | 200 | ❌ falls through | marketing landing page |
| `/validation-expert` | 200 | ❌ falls through | marketing landing page |
| `/plugin-directory` | 200 | ❌ falls through | marketing landing page |
| `/admin/rbac` | 200 | ❌ falls through | marketing landing page (NOT RBAC admin) |
| `/settings` | 200 | ❌ falls through | marketing landing page |

## 3. FINDING — MOST PLUGIN ROUTES RENDER THE MARKETING/HOME PAGE

The portal **starts and is inspectable** (frontend 200 + backend health 200 + `/` home + `/model-company`
plugin render + 0 page errors). However, **9 of 11 tested plugin routes** (`/catalog`, `/create`,
`/data-products`, `/marketplace`, `/urs-composer`, `/validation-expert`, `/plugin-directory`,
`/admin/rbac`, `/settings`) render the Nexora **marketing landing page** (the `/` home page) instead of
their Backstage plugin UIs. Only `/model-company` (and the home itself) render their intended UI.

Classification: **PRE-EXISTING frontend routing behavior** (not a start-blocker; the portal is up and
inspectable). Root cause is not in the backend (all backend health/API checks pass); it is a frontend
route-mounting/binding condition in the `createApp` (new frontend system) feature set — the custom
plugins and the `catalog`/`scaffolder`/`rbac` routes are not matching, while `model-company` is.

**Action:** per gate constraints ("do not fix cosmetic issues", "do not add functionality", "do not modify
Backstage Core", "only fix a P0 blocker if it prevents the portal from starting"), this is **documented,
not fixed** in this gate. It is not a P0 start-blocker.

## 4. ACCEPTANCE MATRIX

| Item | Result |
|---|---|
| Frontend serving | ✅ PASS (HTTP 200) |
| Backend readiness | ✅ PASS (HTTP 200) |
| Backend liveness | ✅ PASS (HTTP 200) |
| Authorization Registry health | ✅ PASS (HTTP 200) |
| Browser automation available | ✅ PASS (Playwright + Chromium) |
| Home page renders | ✅ PASS |
| Model Company journey renders | ✅ PASS |
| Catalog journey renders | ❌ FAIL (marketing fall-through) |
| Create/Scaffolder journey renders | ❌ FAIL (marketing fall-through) |
| Data Products journey renders | ❌ FAIL (marketing fall-through) |
| Marketplace journey renders | ❌ FAIL (marketing fall-through) |
| URS Composer journey renders | ❌ FAIL (marketing fall-through) |
| Validation Expert journey renders | ❌ FAIL (marketing fall-through) |
| Plugin Directory journey renders | ❌ FAIL (marketing fall-through) |
| RBAC Admin journey renders | ❌ FAIL (marketing fall-through) |
| Settings journey renders | ❌ FAIL (marketing fall-through) |
| Uncaught page errors | ✅ PASS (0) |
| Console errors (blocking) | ✅ PASS (only cosmetic findDOMNode warnings) |
| RBAC authority unchanged | ✅ PASS |
| Golden Paths unchanged | ✅ PASS |
| Backstage Core unchanged | ✅ PASS |

## 5. REQUIRED ANSWERS (gate-specific)

- Portal running on frontend 3000 + backend 7007? **YES**
- Readiness HTTP 200? **YES**
- Authorization Registry reachable? **YES** (health 200; protected endpoints 401 = auth enforced)
- Permission Framework operational? **YES** (health 200 + auth-enforced 401s)
- Community RBAC authoritative? **NO** (unchanged)
- All plugin user journeys render their UI? **NO** — only Home and Model Company; the other 9 tested
  routes render the marketing landing page (documented pre-existing routing condition).

## 6. GIT SAFETY

No commit/push. No source changed in this gate (verification only). `.runtime/` artifacts
(`portal-ui-verify.mjs`, `portal-ui-result.json`) are gitignored. No secrets, `.env`, keys, or generated
junk staged.

## 7. FINAL VERDICT

**PORTAL_RUNTIME_UP — UI_JOURNEY_VERIFICATION_COMPLETE_WITH_CONDITIONS**

The full portal runtime is **up and healthy** (frontend + backend + readiness/liveness + Authorization
Registry + Permission Framework), and browser automation confirms the SPA loads with 0 page errors. The
verification is conditioned on a **pre-existing frontend routing finding**: most plugin routes render the
Nexora marketing landing page instead of their plugin UIs (only Home and Model Company render correctly),
which is documented here as a non-start-blocking condition for a follow-up frontend routing investigation.
No RBAC authority switch, no architecture redesign, no Golden Path / Backstage Core changes.

