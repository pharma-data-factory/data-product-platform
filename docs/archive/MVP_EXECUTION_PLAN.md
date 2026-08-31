# NEXORA — MVP EXECUTION PLAN

**Status:** PLAN — NO CODE CHANGED
**Datum:** 2026-08-29
**Basis:** Fresh MVP Baseline Assessment vom 2026-08-29 (Read-Only-Audit mit Live-Runtime-Evidenz:
`tsc` grün, `guard:platform` grün, Backend + alle 8 Plugin-Health-Endpoints live OK, Catalog mit
9 Templates live, Browser-Verifikation der öffentlichen Seiten, Testlauf urs-composer 4/5 Suiten grün).
**Verhältnis zu `SIMPLIFICATION_MASTER_PLAN.md`:** Der Master Plan ist durch das frische Audit zu
~80 % bestätigt. Zwei Korrekturen sind eingearbeitet (Abschnitt 2, D5/D6), eine Verifikation steht
noch aus (D7). Dieser Plan ersetzt die Wave-Nummerierung nicht, sondern priorisiert neu:
**erst die MVP-Credibility, dann Konsolidierung, dann Cleanup.**
**Kernel:** Backstage 1.53 bleibt unveränderter Plattform-Kernel (AGENTS.md Prime Directive).

---

## 0. RAHMEN & SICHERHEITSREGELN

Es gelten die Regeln aus `AGENTS.md` und Abschnitt 0 des Master Plans, zusätzlich:

1. Kein Backstage-Core-Change, kein Patching, keine privaten Imports (Guard-Script prüft das).
2. Keine Dependency-Änderung ohne `DEPENDENCY_CHANGE_REQUIRED`-Gate.
3. Keine Permission-Entfernung ohne vollständigen Verwendungsnachweis (Grep + Tests).
4. Keine Plugin-Entfernung ohne Referenzfreiheit-Nachweis.
5. Kein Commit/Push ohne explizite Freigabe. Jede Phase endet mit Verifikations-Gate.
6. Jede Phase bleibt einzeln revertierbar; additive Änderungen zuerst.

**Begriffe:** `LIVE_PROVEN` (im Audit live bewiesen) · `CODE_SUPPORTS` (implementiert, nicht live bewiesen) ·
`NOT_PROVEN` (unbewiesen). Der MVP ist erst komplett, wenn Story 1 und Story 2 `LIVE_PROVEN` sind.

---

## 1. MVP-ZIELBILD & AKZEPTANZ-STORIES

Kleinste glaubwürdige End-to-End-Plattform: **Discover → Build → Govern → Validate → Operate**
für Data Products um ERP/MES/LIMS/SCADA-Systeme, auf unverändertem Backstage-Kernel.

### Story 1 — Developer Golden Path (MUST)

```
Login (GitHub mit Catalog-User; Guest nur dev)
→ Golden Path finden (Home/Build//releases)
→ Data Product parametrisieren (Scaffolder)
→ Repository wird nach GitHub publiziert
→ Catalog-Registration gelingt
→ Produkt erscheint unter /data-products/:name (Contract/Components/Quality/Health sichtbar)
→ generiertes Produkt baut (Template-CI) und /health ist erreichbar
```

Aktueller Stand: CODE_SUPPORTS (alles implementiert; Publish/Registration live NOT_PROVEN).

### Story 2 — Controlled Change / Validation (MUST)

```
Business Need / Requirement Set anlegen (URS Composer)
→ Approval-Workflow durchlaufen → Baseline APPROVED
→ Validation Expert referenziert genau diese APPROVED Baseline (HTTP, kein DB-Griff)
→ Validation Context + Evidence-Beziehung sichtbar und nachvollziehbar
```

Aktueller Stand: CODE_SUPPORTS (inkl. APPROVED-Gate); Browser-Beweis NOT_PROVEN;
Enforcement-Lücke im validation-expert-backend.

### MVP-Erfolgskriterium

Beide Stories sind `LIVE_PROVEN` (Browser-Evidenz), Gates sind grün
(`tsc`, `guard:platform`, Ziel-Testsuiten), und es existiert **keine** offene P0-Lücke mehr.

---

## 2. FESTLEGUNGEN (Entscheidungen dieses Plans — übersteuerbar)

| # | Entscheidung | Begründung (Evidenz) |
|---|---|---|
| D1 | **Eigene `PlatformPermissionPolicy` bleibt autoritativ.** Community-RBAC-Backend bleibt deaktiviert; `/rbac`-Mount + Nav-Links werden entfernt; Entscheidung wird dokumentiert. | Audit: Policy aktiv, fail-closed, Entitlement-/Release-Gate verankert; Community-Backend auskommentiert, Frontend rendert ins Leere |
| D2 | **VALIDATOR-Rolle additiv einführen** (Phase 2), URS-/Validation-Domain-Groups entweder an die Policy anbinden oder als ungenutzt dokumentieren. | Catalog-Groups existieren, werden heute ignoriert; PO darf kein GxP-Reviewer sein |
| D3 | **Dev-Sign-in über Environment-Gate reparieren** (Phase 1): Guest-Button rendert bei `auth.environment !== 'production'` statt bei Sichtbarkeit von `auth.providers.guest` (Config-Visibility ist unzuverlässig, Alt-Versuch mit `@visibility frontend` wirkungslos). Production-Schutz ist bewiesen: `app-config.production.yaml` setzt `environment: production` und enthält keinen Guest-Provider. | Audit P0: Guest-Button rendert nicht; GitHub-only blockiert neue Entwickler |
| D4 | **validation-manager und authorization-registry-backend: FREEZE jetzt, Entfernung in Phase 5** nach Referenznachweis. `plugins/validation-manager/node_modules/` (isolierte Installation) niemals committen. | Beide ohne echten Konsumenten; validation-manager zusätzlich Governance-Verstoß |
| D5 | **Korrektur zum Master Plan:** data-products `/consume/*`-Routen sind NICHT tot (Konsument: `@internal/data-product-consumption`) und bleiben erhalten. Entfernung nur für `/releases*` nach erneuter Caller-Verifikation. | Backend-Audit: consume-Router wird vom Consumption-Package importiert |
| D6 | **Korrektur zum Master Plan:** Kein Jest-Rebuild in Wave 0. Der Runner funktioniert (Live-Lauf 4/5 Suiten, 30/31 Tests); repariert wird nur der eine `act()`-Test-Bug. | Live-Testlauf 2026-08-29 |
| D7 | `createBaseline`-Signatur-Mismatch (router.ts:536 vs service.ts:705): auf Typebene heute grün (`tsc` clean) — **Runtime-Verifikation per Test in Phase 3** vor weiterem Vertrauen in Baselines. | tsc grün, Runtime-Verhalten offen |
| D8 | **VE-Persistenz bleibt im MVP Datei-basiert** (`runs-store.json`), aber: Datei enttracken + `.gitignore`. PG-Migration = Post-MVP-Option. | MVP-Scope; Datei-Store funktioniert, nur nicht production-grade |
| D9 | **Marketplace/AWS/Metering = Commercial Release**, nicht Teil des Technical MVP. Lokaler Entitlement-Provider bleibt. | Audit §11 |

---

## 3. PHASE 0 — BASELINE SAFETY & COMMITS

**OBJECTIVE:** Arbeitsbaum vertrauenswürdig machen; alle Gates grün; keine Feature-Änderung.

**EXACT DELTAS:**
1. Uncommittete Änderungen in sachliche Commits gruppieren (Reihenfolge einhalten):
   - **C1 GUARDRAILS:** `AGENTS.md`, `scripts/verify-platform-guardrails.mjs`, `docs/architecture/DEPENDENCY_GOVERNANCE.md`, `.github/workflows/ci.yml` (guard-Zeile), `package.json` (guard-Script), `PLATFORM_GUARDRAILS_REPORT.md`
   - **C2 PORTAL:** `packages/app/src/modules/{admin,build,my-products,validate}` (neu), `App.tsx`, `Sidebar.tsx`, `HomeDashboard.tsx`, `packages/platform-common/src/dashboard.ts`
   - **C3 IN-PROGRESS-FEATURES:** plugin-directory (Frontend + Backend + `plugin.yaml` + Design-Doc), urs-composer-Seiten/-Tests, authorization-registry-backend, validation-manager-backend/router.ts, `examples/org.yaml`, `templates/aas-data-product/mkdocs.yml` — vor Commit inhaltlich prüfen (laufen die Änderungen auf die Phase-1/2-Ziele zu oder zurückhalten?)
   - **C4 DEPENDENCIES:** `yarn.lock` als eigener Commit; vorher prüfen, dass die +559 Zeilen nur die erwartete Angleichung sind (`yarn install --immutable` muss in CI grün sein — das ist der eigentliche Beweis)
   - **C5 DOCUMENTATION:** neue Reports (RBAC-Migration, Runtime-Recovery, Portal-Reports, Master Plan) committen; Alt-Reports gemäß Master-Plan §7 nach `docs/archive/` verschieben (separater Commit,MOVE ≠ Löschen)
2. Den einen Test-Bug fixen: `plugins/urs-composer/src/components/CreateWizard/steps/BusinessCapabilityStep.test` — `act()`/setState-after-unmount (Await/Flush statt Warning).

**DEPENDENCIES:** keine.

**ACCEPTANCE CRITERIA:**
- `git status` zeigt nur noch beabsichtigte Reste.
- `yarn tsc` grün, `yarn guard:platform` grün, `yarn lint --since origin/main` grün.
- `plugins/urs-composer`-Suite 5/5 grün (nach Test-Fix).
- Browser-Smoke: Landing + Architecture + Sign-in-Seite rendern.

**RISKS:** niedrig. Einziger Prüfpunkt: yarn.lock-Inhalt (C4) — bei unerwartetem Drift: Commit stoppen und als `DEPENDENCY_CHANGE_REQUIRED` melden.

**OUT OF SCOPE:** jede Produktivcode-Änderung außerhalb des Test-Fixes.

---

## 4. PHASE 1 — CORE DEVELOPER GOLDEN PATH

**OBJECTIVE:** Ein Entwickler kommt ohne Sonder-Hacks in die Plattform, und Story 1 wird einmal
kontrolliert live bewiesen.

**EXACT DELTAS:**
1. **P0 Dev-Sign-in (D3):** `LandingSignInPage.tsx` — `guestEnabled = environment !== 'production'`
   (Config-Visibility-Abhängigkeit entfernen); Fehlerpfad von `guestIdentity.ts` bleibt als
   Fallback-Meldung. Optional: frontend-sichtbarer Override `app.guestSignIn` in
   `packages/app/config.d.ts` (Muster: existierender `clientId`-Eintrag). Production-Verhalten
   per Config-Review verifizieren (kein Guest-Provider in `app-config.production.yaml`).
2. **P1 `/settings`:** `userSettingsPlugin` in `packages/app/src/App.tsx` Features-Liste registrieren
   (Dependency existiert bereits in `packages/app/package.json`). Beide Sidebar-Links zeigen dann real.
3. **Kleinstfix:** `HomeDashboard` — ungenutzte `recentlyUsed`-Prop entfernen oder rendern.
4. **Live-Beweis Story 1:** kontrollierter Scaffolder-Lauf eines WORKING-Templates
   (Empfehlung: `mqtt-temperature-data-product`) mit `publish:github` + `catalog:register`
   in eine **Test-Org/Test-Repo**; danach Browser-Nachweis: `/data-products/:name` mit
   Contract/Components/Quality/Health, CI-Status-Chip. Test-Repo nach Evidenz nur mit
   Freigabe wieder löschen.

**FILES/DOMAINS:** `packages/app/src/modules/identity/*`, `packages/app/src/App.tsx`,
`packages/app/src/modules/home/HomeDashboard.tsx`, `.env`-GitHub-App-Werte (nur verifizieren, nicht ändern).

**DEPENDENCIES:** Phase 0.

**ACCEPTANCE CRITERIA:**
- Guest-Button rendert lokal; Guest-Login liefert DEVELOPER-Identität (`user:default/guest`);
  in Production-Konfig rendert er nicht (Config-Review als Evidenz).
- `/settings` rendert das User-Settings-Plugin.
- Story 1 = LIVE_PROVEN (Screenshot-/Snapshot-Evidenz + Catalog-Entity des neuen Produkts).

**RISKS:** mittel — GitHub-Publish berührt ein externes System. Milderung: Test-Org,
explizite Freigabe vor dem Lauf, keine Produktiv-Assets.

**OUT OF SCOPE:** neue Templates, Template-Inhalte, `/create`-UX-Umbau.

---

## 5. PHASE 2 — GOVERNANCE & AUTHORIZATION ENFORCEMENT

**OBJECTIVE:** Enforcement vollständig, tote RBAC-UI entfernt, Rollenmodell entschieden (D1/D2).

**EXACT DELTAS:**
1. **Enforcement validation-expert-backend:** `authorize()`-Aufrufe für die bereits definierten
   Permissions (`validation.read`, `validation.run.start`, `validation.test.execute`,
   `validation.review`, `validation.admin`) in `plugins/validation-expert-backend/src/router.ts`
   (Muster: `authorize()`-Helper aus urs-composer-backend übernehmen; Helper-Duplikat wird in
   Phase 5 zentralisiert) + Router-Tests mit ALLOW/DENY-Pfaden.
2. **`/rbac` entfernen (D1):** `rbacPlugin` aus `App.tsx`, Sidebar-Link, Admin-Landing-Card;
   Community-RBAC-Pakete bleiben installiert (Entscheidungsdokument erklärt warum).
   Neues `docs/architecture/AUTHORIZATION_DECISION.md`: eigene Policy autoritativ,
   Community-RBAC = Post-MVP-Option.
3. **VALIDATOR-Rolle additiv (D2):** `platform-common/src/roles.ts` + Permission-Sets
   (`validation.review`, `urs.approve`, Validierungs-Reads), Gruppe `validators` in
   `examples/org.yaml` + `catalog/org.yaml`, Rollen-Tests. Reihenfolge: erst Rolle addieren,
   danach OWNER-Set um `validation.review`/`urs.approve` bereinigen (Master-Plan §3.4).
4. **Permission-Dedup:** `permissions/urs.ts` + `permissions/validation.ts` entfernen,
   Importe auf `permissions.ts` umstellen (keine Re-Export-Shims).
5. **Hybrid-Check entfernen:** belt-and-suspenders `resolvePlatformRole`-Checks in
   `entitlements-backend/src/router.ts` (Framework-Check genügt).
6. **Obsolete Permissions:** `validation.approve`, `risk.accept`, `baseline.modify` nur nach
   Grep-Nachweis (0 Grants/Checks) entfernen — oder `validation.approve` bewusst als
   VALIDATOR-Permission reaktivieren, falls der Approval-Workflow es braucht (Entscheidung hier).

**FILES/DOMAINS:** `platform-common` (roles/permissions/policy), `plugins/validation-expert-backend`,
`packages/app` (App.tsx, Sidebar, AdminLanding), `entitlements-backend`, org-Dateien, Tests, Doku.

**DEPENDENCIES:** Phase 1 (stabile UI für Browser-Gegenprüfung).

**ACCEPTANCE CRITERIA:**
- VE-Router liefert 403 ohne Permission (Test + manueller API-Check).
- `/rbac` nicht mehr erreichbar/nicht mehr verlinkt.
- Browser-Gegenprüfung: Developer sieht Validate, darf aber nicht approven; VALIDATOR schon;
  Admin unverändert.
- Rollen-/Set-Diff-Tests grün; `tsc` + `guard:platform` grün.

**RISKS:** mittel (Autorisierung). Milderung: streng additive Reihenfolge, jede Verengung
einzeln testbar, kein Permission-Entzug ohne Nachweis.

**OUT OF SCOPE:** Community-RBAC-Aktivierung, Casbin, konditionale Policies, RBAC-Admin-UI.

---

## 6. PHASE 3 — VALIDATION STORY E2E

**OBJECTIVE:** Story 2 wird browser-bewiesen; Baseline-Vertrauen ist runtime-verifiziert (D7/D8).

**EXACT DELTAS:**
1. **Browser-Evidenz Story 2:** Requirement Set anlegen → Approval → Baseline APPROVED →
   Validation Expert zeigt Validation Context mit genau dieser Baseline; Evidence-Verknüpfung
   sichtbar. Als angemeldeter Nutzer mit passenden Rollen (nach Phase 2: VALIDATOR/OWNER).
2. **`createBaseline`-Runtime-Check (D7):** gezielten Test gegen `POST /baselines`
   (router.ts:536 ↔ service.ts:705) schreiben; bei Mismatch fixen.
3. **VE-Persistenz hygienisch (D8):** `packages/backend/validation/runtime/runs-store.json`
   aus dem Git-Tracking nehmen (`.gitignore` ergänzen: `validation/runtime/*.json` bzw.
   `packages/backend/validation/runtime/`); lokale Daten bleiben erhalten.
4. Optional: URS→Data-Product-Traceability-Lücke dokumentieren (nur `businessCapabilityRefs`,
   keine direkte Produkt-Verknüpfung) — als bekanntes MVP-Limit in der Doku, nicht als Code.

**FILES/DOMAINS:** `plugins/urs-composer-backend` (Test), `plugins/validation-expert-backend`,
`.gitignore`, Doku.

**DEPENDENCIES:** Phase 2 (Rollen für die Browser-Evidenz).

**ACCEPTANCE CRITERIA:**
- Story 2 = LIVE_PROVEN (Browser-Evidenz je Schritt).
- `createBaseline`-Test grün.
- `git ls-files | grep runs-store` ist leer.

**RISKS:** niedrig.

**OUT OF SCOPE:** Part-11-Compliance, regulatorische Aussagen, VE-PG-Migration.

---

## 7. PHASE 4 — HOSTED MVP HARDENING

**OBJECTIVE:** Der gehostete Pilot (Portainer/GHCR/PostgreSQL) ist nachweisbar deploybar.

**EXACT DELTAS:**
1. **Config-Bug:** `app-config.docker.yaml` — `app.baseUrl` zeigt auf `http://localhost:7007`
   (Backend-Port); auf den korrekten Frontend-Wert korrigieren.
2. **Production-Sicherheits-Check als dokumentierter Nachweis:** kein Guest-Provider,
   `auth.environment: production`, CORS nicht wildcard, `permission.enabled: true`,
   GitHub-`dangerouslyAllowSignInWithoutUserInCatalog` in Production entfernen/ersetzen.
3. **E2E-Smoke (Playwright):** minimale Suite (Sign-in → Home → /releases → /data-products),
   lokal lauffähig; CI-Integration als optionaler Job (kein Pflicht-Gate, um die CI nicht zu blockieren).
4. **Compose-Smoke:** `docker-compose.production.yml` lokal gegen PG16 hochfahren,
   Readiness (`/.backstage/health/v1/readiness`) + ein API-Health als Evidenz.

**FILES/DOMAINS:** `app-config.docker.yaml`, `app-config.production.yaml`, Playwright-Setup,
`deploy/`, CI-Workflow (optionaler Job).

**DEPENDENCIES:** Phasen 1–3 (Inhalt, der gehostet wird).

**ACCEPTANCE CRITERIA:** Compose-Stack startet grün; E2E-Smoke lokal grün;
Production-Checkliste als Doku-Evidenz.

**RISKS:** niedrig-mittel (Docker/Windows-Umgebung).

**OUT OF SCOPE:** TLS-Automatisierung, Backup-Strategie, Secrets-Manager, Monitoring-Stack.

---

## 8. PHASE 5 — ARCHITECTURE & CLEANUP (Master-Plan Waves 3+4, korrigiert)

**OBJECTIVE:** Schichtenverstöße beseitigen, toten Code entfernen, Repo aufräumen —
erst jetzt, weil alles Referenznachweise braucht und die MVP-Stories nicht blockiert.

**EXACT DELTAS:**
1. **AAS extrahieren:** `packages/backend/src/aas/*` → `plugins/aas-backend`
   (pluginId `aas` bleibt, API identisch); `modules/assets/aasClient.ts` daneben als
   Frontend-Baustein konsolidieren (Master-Plan MERGE).
2. **validation-manager entfernen (D4):** Backend-Deregistrierung, dann Frontend + Backend +
   isoliertes `node_modules` löschen (Referenznachweis liegt im Audit vor: kein Mount, keine Routen,
   keine Konsumenten; `schema.sql` wurde nie ausgeführt → kein DB-Risiko).
3. **authorization-registry-backend entfernen (D4)** nach erneutem Konsumenten-Nachweis —
   alternativ behalten und httpAuth/Permission-Injection ergänzen, falls die Profile als
   Admin-Dokumentation weiter genutzt werden sollen. Entscheidung zu Phase-5-Beginn.
4. **UNUSED-Routen (korrigiert, D5):** nur `/releases` + `/releases/transition` nach
   erneutem 0-Caller-Nachweis entfernen. `/consume/*` bleibt.
5. **Helper zentralisieren:** `authorize()`/`respondError()`-Duplikate (7 Router) →
   ein Helper in `platform-common`.
6. **Config-Reconciliation:** READ-never-DEFINED- und DEFINED-never-READ-Keys
   (Master-Plan §6) dokumentieren oder entfernen (nur Config-Text).
7. **Repo-Hygiene:** Root-MDs gemäß Master-Plan §7 (MOVE/ARCHIVE, keine Löschung ohne Sichtprüfung);
   `.runtime`-Regeln in `.gitignore` prüfen.
8. **URS-Legacy-Tabelle `requirements`:** Migrations-Plan schreiben (nicht ausführen).

**FILES/DOMAINS:** `packages/backend`, `plugins/*`, `platform-common`, `docs/`, Root.

**DEPENDENCIES:** Phasen 0–4 (stabile Gates vor jeder Löschung).

**ACCEPTANCE CRITERIA:** `tsc`, `guard:platform`, volle Test-Suite, Browser-Smoke aller
Bereichs-Hubs; jede Löschung mit Grep-Nachweis im Commit dokumentiert.

**RISKS:** mittel (Löschungen). Milderung: Git-History als Rollback, Nachweis je Kandidat,
keine DB-Änderung.

**OUT OF SCOPE:** Equipment-Triplikation auflösen (nur dokumentieren), Entitlement-Store-Merge
(nur dokumentieren), neue Features.

---

## 9. VERIFIKATIONS-MATRIX (pro Phase)

| Gate | P0 | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|---|
| `yarn tsc` | ● | ● | ● | ● | ● | ● |
| `yarn guard:platform` | ● | ● | ● | ● | ● | ● |
| Ziel-Testsuiten (urs-composer, VE, policy) | ● | ● | ● | ● | ○ | ● |
| Browser-Smoke (public) | ● | ● | ○ | ● | ○ | ● |
| Browser-Story 1 live | | ● | | | | |
| Browser-Story 2 live | | | | ● | | |
| Rollen-Gegenprüfung (Dev/Validator/Admin) | | | ● | ○ | | |
| Compose/Readiness-Smoke | | | | | ● | |
| Volle Test-Suite | | | | | ○ | ● |

● = Pflicht-Gate der Phase · ○ = empfohlen

---

## 10. AUFWAND & REIHENFOLGE

| Phase | Aufwand (grob) | MVP-Blocker? |
|---|---|---|
| 0 — Baseline & Commits | 0,5–1 Tag | ja (prozedural) |
| 1 — Developer Golden Path | 2–3 Tage | ja (Sign-in + Live-Beweis) |
| 2 — Governance & Enforcement | 2–3 Tage | nein (aber vor Phase 3 nötig) |
| 3 — Validation Story | 2–3 Tage | nein |
| 4 — Hosted Hardening | 1–2 Tage | nein |
| 5 — Architecture & Cleanup | 3–5 Tage | nein (Post-MVP-tauglich) |

**Kritischer Pfad zum Technical MVP: Phase 0 → 1 → 2 → 3.** Phase 4 macht den MVP hostbar,
Phase 5 räumt auf und ist bewusst abtrennbar.

---

## 11. EXPLIZIT NICHT IM MVP-SCOPE

AWS Marketplace / Metering / Billing / Legal-Closure · SaaS/Multi-Tenancy · RBAC-Admin-UI ·
Community-RBAC-Aktivierung · AAS als Produkt-Feature (über Basis-Erhalt hinaus) ·
Composer-Erweiterungen · Model-Company-Ausbau · neue Golden Paths ·
VE-PG-Migration · URS-Tabellen-Migration (nur Plan) · Equipment-Modell-Konsolidierung.

---

## 12. STOP-CONDITIONS

Es gilt zusätzlich zu AGENTS.md:

- Unerwarteter yarn.lock-Drift in Phase 0 → `DEPENDENCY_CHANGE_REQUIRED`, Commit stoppen.
- Scaffolder-Live-Lauf in Phase 1 scheitert an GitHub-App-Rechten → Beweise sammeln,
  nicht an AGENTS.md-Regeln vorbei „reparieren".
- Jede Authorization-Änderung, die eine Verengung ohne Testnachweis erfordert → stoppen und melden.
- Eine Phase, die ein Gate zweimal hintereinander nicht erreicht → Phase neu planen statt fortsetzen.

---

## 13. ERSTER KONKRETER SCHRITT

**Freigabe dieses Plans, dann Phase 0:** Commit-Vorschläge C1–C5 werden als
separate, benannte Commits vorbereitet (nichts wird ohne Freigabe committet).
Parallel: Entscheidung zu C3 (in-progress-Änderungen einbeziehen oder zurückhalten)
und zu D6-Punkt `validation.approve` (reaktivieren für VALIDATOR oder nach Nachweis entfernen).

**STOP — dieser Plan ändert nichts am Code. Er wartet auf Freigabe.**
