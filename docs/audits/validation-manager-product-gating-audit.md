# Validation Manager — Produkt-Gating-Audit

> Audit-Datum: **2026-09-13** · **Read-only** (keine Code-, Schema-, Config- oder Teständerung; einziger Schreibvorgang ist dieses Dokument)
>
> **Follow-up 2026-09-13 (Remediation umgesetzt):** Alle P0-Lücken (1–4), P1-Lücken (5–6) und die P2/P3-Lücken (8–10) sind behoben und durch Tests abgedeckt. Details und Testergebnisse in [§ 9 Remediation](#9-remediation-umgesetzt). Der ursprüngliche Verdict NON_COMPLIANT bezieht sich auf den Stand **vor** der Remediation.

---

## 1. Executive Verdict

**NON_COMPLIANT**

Der implementierte Code erzwingt an keiner Stelle, dass eine Validierung erst dann aktiv/ausführbar wird, wenn eine konkrete Solution/Produkt- **und** Produkt-/Solution-**Version** referenziert ist. Ein "Validation Context" wird ausschließlich aus einer freigegebenen (APPROVED) URS-Baseline erzeugt — Produkt/Version existieren im Datenmodell des Validation Managers schlicht nicht (`plugins/validation-expert-backend/src/types.ts:129-143`, `db/migrations.ts:9-27,76-88`). Lauffähige Tests, Testausführung, Evidenz-Erfassung und technische Freigaben des Produkts können damit bereits **allein auf Basis einer URS-Baseline** bzw. sogar ganz ohne Baseline (Datenspeicher `validation_runs` nutzt eine freie Zeichenkette `candidate` als Platzhalter) stattfinden. Es gibt keinerlei Status "WAITING_FOR_SOLUTION" (oder Äquivalent) und keinerlei Server-seitige Prüfung, die Produkt-/Version-Referenz verlangt. Die Referenzkette URS→Produkt→Test→Evidenz ist unvollständig: URS↔Produkt ist über den Product Composer (Release-Gate) angebunden, aber Produkt/Version→Validation ist **nicht** angebunden.

---

## 2. Tatsächlich implementierter Ablauf (nur codebasiert)

### 2.1 Registrierung der Plugins
- Backend registriert alle drei relevanten Plugins: `packages/backend/src/index.ts:44-46` (`validation-expert-backend`, `urs-composer-backend`, `composer-backend`).
- Frontend registriert `validationExpertPlugin`, `ursComposerPlugin`: `packages/app/src/App.tsx:11-13,67-68`.

### 2.2 URS Composer → freigegebene Baseline
- URS-Statusmaschine: `plugins/urs-composer-backend/src/domain/transitions.ts:16-45` (Version/Baseline-Lifecycle, `APPROVED` nur via QA-Signatur, `IN_APPROVAL`→`APPROVED`), `SET_TRANSITIONS` `:53-77`.
- Baseline-Freigabe/-Release: `service.ts:2208` (`approveBaseline`), `:2005` (`releaseBaseline`), `:2355` (`submitBaseline`), `:2419` (`approveApprovalStep`), `:2550` (`releaseBaseline` in final step).

### 2.3 Validation Context ← APPROVED URS (einziges Entry-Gate, KEIN Produkt)
- Aus `{ requirementSetId, baselineId }` wird via HTTP an URS Composer (`GET /api/urs-composer/...`) ein `ApprovedURSReference` aufgelöst und auf `approvalStatus === 'APPROVED'` geprüft:
  - Service: `plugins/validation-expert-backend/src/service.ts:338-376` (`createContextFromApprovedUrs`), Gate-Zeile `:362-366`.
  - HTTP-Resolver: `plugins/validation-expert-backend/src/urs-baseline-resolver.ts` (OBO-Token, `resolveApprovedBaseline`).
  - Router: `router.ts:431-458` (`POST /contexts/from-urs`).
- Der `ValidationContext` enthält ausschließlich `source: ApprovedURSReference` + `status`; **kein** `productId`/`solutionId`/`versionId`: `packages/platform-common/src/validation-integration.ts:47-59`, `types.ts:199-202` (`CreateValidationContextRequest` = nur `requirementSetId` + `baselineId`).

### 2.4 Run erstellen (ausführbare Tests) — mit oder ohne Context, OHNE Produkt
- `ValidationRun` trägt `candidate` (freier String), `baselineId`, optional `contextId` — **kein** Produkt-/Versionsfeld: `types.ts:129-143`.
- Service `createRun`: `service.ts:196-238`. Ohne `contextId` liest es eine Baseline-YAML aus dem Dateisystem oder nimmt den Default `'PDF-PC-VAL-BL-1.0'` (`:226-228`). **Keine** Produkt-/Versionspflicht.
- Router `POST /runs`: `router.ts:197-220` — einzige Pflichtfelder: `type` ∈ {IQ,OQ,UAT} und `candidate` (nicht leer).
- DB-Tabelle `validation_runs`: `db/migrations.ts:9-27` (`candidate`, `candidate_commit`, `baseline_id`, `context_id`) — **keine** Produkt-/Versionsspalte.

### 2.5 Executive Tests / Testausführung / Evidenz — OHNE Produkt möglich
- `startTest`, `recordManualResult`, `executeAutomated`: `service.ts:378-589` — arbeiten nur auf `run` (via `requireMutableRun`, `:647-656`); keine Produkt-/Versionsprüfung.
- Evidenz `addEvidence`: `service.ts:620-645` — nur `runId`/`testId`; keine Produktreferenz.
- Komplett separater Weg: `registerTechnicalEvidence` (`service.ts:141-186`) + Router `POST /evidence/technical` (`router.ts:306-343`) — erzeugt Evidenz **ohne Validierungs-Run und ohne Produkt-Version**, nur `evidenceType='ci-quality-gate'` + `idempotencyKey`.

### 2.6 Frontend: Start-Buttons hartcodiert, ohne Produkt
- `ContextDetailPage` startet Run mit hartcodiertem Kandidaten: `plugins/validation-expert/src/components/ContextPages.tsx:213` → `api.createRun('platform-core-v1.0-rc2', type, { contextId })`.
- `ProtocolPage` startet ohne Kontext, gleicher hartcodierter String: `ProtocolPages.tsx:55` → `api.createRun('platform-core-v1.0-rc2', type)`.
- Einzige UI-Gates sind rollenbasiert: `canStartValidationRun(role)` / `canExecuteValidationTest(role)` — rein Frontend, `DEVELOPER` genügt (`packages/platform-common/src/policy.ts:139-145`).

### 2.7 Product Composer (Produkt-/Versions-Modell existiert, NUR Produktseite)
- Vollständiges Domänenmodell: `packages/platform-common/src/product.ts:64-105` (`Product`), `:89-105` (`ProductVersion`), `:176-194` (`ProductBaseline`).
- Tabellen: `plugins/composer-backend/src/db/migrations.ts:11-60` (`products`, `product_versions`), `:199-227` (`product_baselines`).
- Release-Gate (4 lokale Checks + Cross-Plugin URS-Prüfung): `service.ts:842-1002` (`checkReleaseGate`), Transitionen `service.ts:89-95` (`DRAFT→APPROVED→RELEASE_CANDIDATE→RELEASED→SUPERSEDED`). Cross-Plugin URS-Check `:892-917`.
- **Wichtig:** das Release-Gate prüft nur Produkt↔URS; umgekehrt referenziert **kein** Validation-seitiger Code ein `Product`/`ProductVersion`.

---

## 3. Soll-Ist-Matrix je fachlicher Regel

| Fachliche Regel | Implementiert | Evidenz |
|---|---|---|
| URS Composer erzeugt/versioniert/reviewt/gibt URS frei (Approve+Baseline) | JA (volle Statusmaschine + Signatur) | `plugins/urs-composer-backend/src/domain/transitions.ts:16-77`, `service.ts:2208,2355,2419` |
| Solution/Product Composer erzeugt Product + ProductVersion + Komponenten | JA (Modell + Tabellen + Endpoints) | `platform-common/src/product.ts:64-105`, `composer-backend/src/db/migrations.ts:11-60`, `composer-backend/src/router.ts:131-280` |
| Validation Manager steuert Validierung einer **konkreten Produkt-/Lösungs-Version** gegen APPROVED URS | **NEIN** — Produkt/Version fehlt im Validation-Datenmodell | `validation-expert-backend/src/types.ts:129-143`, `validation-integration.ts:47-59` |
| Gültige Kette: …→ URS Baseline → **Solution/Product → Version** → Komponenten → Plan → Risiken → Test → Evidenz → Freigabe | **TEILWEISE** — nur URS→Baseline (Validation) und Produkt↔URS (Release-Gate) sind verdrahtet; das Produkt/Version-Glied fehlt in der Validation-Kette | Gegenbeweis: `grep product/solution` in `validation-expert-backend/src` → nur `parsers.ts:462` (Anzeige-String) |
| Zentrale Regel: APPROVED URS allein darf **keine** ausführbaren Tests/Freigabe auslösen | **VERLETZT (P0)** — Kontext aus URS allein erzeugt, Run aus Kontext **oder ganz ohne** Kontext, Tests/Evidenz ohne Produkt | `service.ts:338-376` (Kontext), `:196-238` (Run), `router.ts:197-220` (nur candidate+type), `technical-evidence` ohne Run `:141-186` |
| Ohne Produkt/Version höchstens: URS lesen, Plan als DRAFT, `WAITING_FOR_SOLUTION` setzen | **NEIN** — kein DRAFT-Plan, kein `WAITING_FOR_SOLUTION`-Status vorhanden | `validation-integration.ts:50` (nur `PENDING\|IN_PROGRESS\|CLOSED`), `types.ts:129-143` |

---

## 4. Gefundene fachliche und technische Lücken (prio P0–P3)

### P0 — Verletzung der Zentralregel (ausführbare Tests ohne Produkt/Version)

1. **Validation Context ohne Produkt/Version erzeugbar.** `createContextFromApprovedUrs` nimmt nur `{ requirementSetId, baselineId }` entgegen (`validation-expert-backend/src/types.ts:199-202`, `service.ts:338-376`). Es gibt keine Pflicht auf `productId`/`productVersionId`, kein Feld dafür, keinen `WAITING_FOR_SOLUTION`-Status.
2. **Run/ausführbare Tests ohne Produkt/Version startbar.** `POST /runs` verlangt nur `candidate` (beliebiger String) + `type` (`router.ts:197-220`). Weder `contextId` noch Produkt/Version sind Pflicht (`service.ts:196-238`). Der Frontend-Start-Button übergibt einen **hartcodierten** Kandidaten `'platform-core-v1.0-rc2'` (`ContextPages.tsx:213`, `ProtocolPages.tsx:55`) und schickt direkt `executeAutomated` (`ContextPages.tsx:216-218`).
3. **Testausführung & Evidenz ohne aktive Instanz mit Produkt.** `startTest`/`recordManualResult`/`executeAutomated` prüfen nur, dass der Run existiert und nicht `COMPLETED` ist (`service.ts:647-656`), nie ein Produkt. `addEvidence` hat keine Produktreferenz (`service.ts:620-645`).
4. **Evidenz ganz ohne Run/Kontext/Produkt anlegbar.** `POST /evidence/technical` + `registerTechnicalEvidence` (`router.ts:306-343`, `service.ts:141-186`) akzeptieren `evidenceType='ci-quality-gate'` + `idempotencyKey` ohne Validierungs-Kontext oder Produkt-Version.

### P1

5. **Fehlendes eindeutiges Referenzieren von Produkt/Version in der Validation-Seite.** Weder `validation_runs` noch `validation_contexts` noch `validation_evidence` haben eine Produkt-/Versionsspalte (`db/migrations.ts:9-27,59-88`). Damit ist URS-Version↔Produkt-Version↔Test↔Evidenz nicht immutabel verknüpft (Traceability-Lücke).
6. **Keine Server-seitige Zustandsmaschine für die Validierungsinstanz.** `ValidationContext.status` ist nur ein String (`'PENDING'|'IN_PROGRESS'|'CLOSED'`, `validation-integration.ts:50`) und wird im Code **nie** gesetzt/übergegangen (nur bei Erzeugung `'PENDING'`, `service.ts:370`). Keine legalen Transitionen, kein `WAITING_FOR_SOLUTION`.

### P2

7. **Product-Composer-Seiten im UI kaum erreichbar / nicht mit Validation verdrahtet.** `/products`, `/products/:id` (Module `products`) und `/compose` existieren (`packages/app/src/modules/products/index.tsx`, `modules/composer/index.tsx`), aber in der Sidebar fehlt ein direkter Eintrag für "Products"; verlinkt sind nur Build/`/compose` („Composer"), `my-products`→Catalog/Data Products (`packages/app/src/modules/nav/Sidebar.tsx:82-121`). Der Validation-Expert-Start-Flow referenziert diese Seiten nicht.
8. **Direkte API-Aufrufe/Deeplinks als Bypass.** Da alle Guards nur Rollen (`validation.run.start`/`validation.test.execute`, `policy.ts:139-145`) sind und keine Produktbedingung existiert, kann `POST /api/validation-expert/runs` mit beliebigem `candidate` direkt ausgeführt werden.

### P3

9. **Audit-Trail fehlt im Validation Manager für kritische Aktionen.** Product Composer hat `composer_audit_events` (`db/migrations.ts:136-162`) und `audit()` (`service.ts:1715-1736`); der Validation Expert hat **keinen** äquivalenten Audit-Pfad für Run-Start/Ergebnis/Evidenz.
10. **Change-Impact bei URS-/Versionsänderung fehlt in der Validation-Richtung.** Product Composer kennt `ProductChangeSignal`/`product_change_signals` (`types.ts:155-171`, `db/migrations.ts:283-306`), aber die Validation-Seite hat keinen äquivalenten Invaliderungs-/Requalifizierungs-Mechanismus.

---

## 5. Evidenz-Index

**Validation Expert Backend (Kernbefunde)**
- `plugins/validation-expert-backend/src/types.ts:129-143` — `ValidationRun` (nur `candidate`/`baselineId`/`contextId`), `:199-202` — `CreateValidationContextRequest` (nur URS).
- `plugins/validation-expert-backend/src/service.ts:196-238` — `createRun` ohne Produktpflicht; `:338-376` — `createContextFromApprovedUrs` (Gate nur `APPROVED`); `:378-589` — `executeAutomated`/`startTest`/`recordManualResult`; `:620-645` — `addEvidence`; `:141-186` — `registerTechnicalEvidence`; `:647-656` — `requireMutableRun`.
- `plugins/validation-expert-backend/src/router.ts:197-220` — `POST /runs`; `:306-343` — `POST /evidence/technical`; `:431-458` — `POST /contexts/from-urs`.
- `plugins/validation-expert-backend/src/db/migrations.ts:9-27` — `validation_runs`; `:59-74` — `validation_evidence`; `:76-88` — `validation_contexts` (keine Produktspalte).
- `plugins/validation-expert-backend/src/repository.ts:18-43` — Repository-Interface (kein Produkt).
- `plugins/validation-expert-backend/src/plugin.ts:114-123` — Verdrahtung `ursBaselineResolver` (HTTP), **kein** Product-Resolver.

**Platform-common (Vertrag)**
- `packages/platform-common/src/validation-integration.ts:21-59` — `ApprovedURSReference`/`ValidationContext` (kein Produkt); `:66-82` — `TechnicalCiEvidenceReference` (produktseitig, nur technisch).
- `packages/platform-common/src/product.ts:64-105` (`Product`), `:89-105` (`ProductVersion`), `:176-194` (`ProductBaseline`).
- `packages/platform-common/src/policy.ts:139-145` — `canStartValidationRun`/`canExecuteValidationTest` (rein rollenbasiert).

**Product Composer**
- `plugins/composer-backend/src/service.ts:89-95` — Versionstransitionen; `:842-1002` — `checkReleaseGate`; `:1004-1177` — `createProductBaseline`; `:1179-1242` — `approveProductBaseline`.
- `plugins/composer-backend/src/evidence-registrar.ts:49-94` — HTTP-Registrar → `POST /evidence/technical` (Cross-Plugin OBO Richtung Composer→Validation).
- `plugins/composer-backend/src/db/migrations.ts:11-60` — `products`/`product_versions`; `:199-279` — `product_baselines`/`product_manifests`.
- `plugins/composer-backend/src/router.ts:131-396` — CRUD/Transition/Release-Gate Routen.

**URS Composer**
- `plugins/urs-composer-backend/src/domain/transitions.ts:16-77` — Statusmaschinen; `service.ts:2208,2355,2419,2550` — approve/submit/approve-step/release.

**Frontend**
- `plugins/validation-expert/src/components/ContextPages.tsx:206-225` — `startRun` (hartcodiert `'platform-core-v1.0-rc2'`).
- `plugins/validation-expert/src/components/ProtocolPages.tsx:51-65` — `startRun` (hartcodiert, ohne Kontext).
- `plugins/validation-expert/src/components/RunPages.tsx:103-266` — Manual-Test-Pass/Fail (kein Produkt).
- `plugins/validation-expert/src/api.ts:284-297` — `createRun(candidate, type, {contextId})`.
- `packages/app/src/modules/nav/Sidebar.tsx:82-150` — Navigation (kein Produkt-Gating).

**Tests (Bestand)**
- `plugins/validation-expert-backend/src/validation-context-integration.test.ts:87-131` (Kontext aus APPROVED; `:133-149` Run aus Kontext **ohne Produkt**); `:151-171` (DRAFT/IN_REVIEW/REJECTED denied); `:236-385` (gegen echtes PostgreSQL); `:386-511` (Autorisierung); `:512+` (Persistenz).
- `plugins/validation-expert-backend/src/technical-evidence.test.ts:11-56` — Evidenz **ohne** Run anlegbar (negativer Beleg der Lücke).
- `plugins/validation-expert-backend/src/service.test.ts`, `coverage.test.ts`, `urs-baseline-resolver.test.ts`.

---

## 6. Empfohlene Ziel-State-Machine (Validierungsinstanz)

Vorgeschlagene Zustände für die Validierungsinstanz (Validierung einer konkreten Produkt-/Solution-Version gegen eine APPROVED URS-Baseline):

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                       (aus APPROVED URS)                       │
                    ▼                                                               │
     ┌───────────────────────┐   assign product+version   ┌──────────────────────┐  │
     │ WAITING_FOR_SOLUTION  │ ──────────────────────────► │      DRAFT           │  │
     │ (nur URS lesen,       │                            │ (Plan/Risiken als    │  │
     │  Plan nur DRAFT,      │                            │  Entwurf, owner+     │  │
     │  keine Tests/Evidenz) │                            │  scope referenziert) │  │
     └───────────────────────┘                            └──────────┬───────────┘  │
            ▲  (Produkt/Version entzogen)                             │ start (Gate)   │
            │                                              ┌──────────▼───────────┐  │
            │                                              │      ACTIVE /         │  │
            │                                              │  EXECUTABLE          │  │
            │                                              │ (Tests ausführbar,   │  │
            │                                              │  Evidenz erfassbar)  │  │
            │                                              └──────────┬───────────┘  │
            │                                           complete & traceability OK  │
            │                                              ┌──────────▼───────────┐  │
            │                                              │   APPROVAL_PENDING   │  │
            │                                              │ (vollständige         │  │
            │                                              │  Traceability nötig)  │  │
            │                                              └──────────┬───────────┘  │
            │                                              approve / release       │
            │                                              ┌──────────▼───────────┐  │
            └──────────────────────────────────────────────┤      RELEASED        │  │
                                                           │ (Validierungs-        │  │
                                                           │  entscheid/Freigabe)  │  │
                                                           └──────────┬───────────┘  │
                                                                    ─ ┘ (Version/Solution wechselt → REQUALIFICATION_REQUIRED)
```

Legale Übergänge (Server-seitig, analog `composer-backend/src/service.ts:89-95` zu erzwingen):

```
WAITING_FOR_SOLUTION → DRAFT           nur wenn Product/Product-Version + Owner + Scope gesetzt
DRAFT               → ACTIVE/EXECUTABLE nur wenn alle Pflichtreferenzen vorhanden
ACTIVE/EXECUTABLE   → DRAFT            (Abbruch)
ACTIVE/EXECUTABLE   → WAITING_FOR_SOLUTION (Produkt/Version zurückgezogen → Tests/Evidenz sperren)
ACTIVE/EXECUTABLE   → APPROVAL_PENDING nur wenn Traceability vollständig + keine offenen FAIL/BLOCKED
APPROVAL_PENDING    → RELEASED         nur durch menschliche Freigabe (nie automatisch)
RELEASED            → REQUALIFICATION_REQUIRED  bei URS- oder Produkt-/Versionsänderung
```

Pflichtreferenzen für "aktiv/ausführbar": `approvalStatus==APPROVED` + `baselineVersion` (eindeutig), `productId`/`solutionId`, `productVersionId`/`solutionVersionId`, `owner`+`scope`, Komponenten-/Golden-Path-Zuordnung soweit in scope.

---

## 7. Konkrete Akzeptanzkriterien „Validation Manager MVP ready"

1. **AC-1 (Ungültiger Start):** `POST /api/validation-expert/runs` ohne gültige Produkt/Version-Referenz liefert `409/422` und erzeugt **keinen** Run. (Testbar über `router.ts:197-220`.)
2. **AC-2 (WAITING_FOR_SOLUTION):** Nach Erstellung eines Kontexts aus einer APPROVED URS ohne Produktzuordnung ist `status == 'WAITING_FOR_SOLUTION'` und keine der ausführbaren Endpoints (`execute-automated`, `tests/:id/start`, `tests/:id/result`) sind erlaubt.
3. **AC-3 (Testfall ohne Produkt/Version abgelehnt):** `POST /runs/:runId/tests/:testId/start` auf einem nicht-aktiven Kontext → abgelehnt (Server-seitig, nicht nur UI).
4. **AC-4 (Evidenz ohne aktive Instanz abgelehnt):** `POST /evidence/technical` (und `addEvidence`) ohne aktive Validierungsinstanz mit Produkt/Version → abgelehnt; Ausnahme dokumentiert nur für reine technische Metadaten mit klar getrenntem Flag (nie als GxP-Evidenz).
5. **AC-5 (Freigabe nur bei vollständiger Traceability):** Ein `APPROVAL_PENDING→RELEASED` wird nur bei vollständiger URS↔Komponente↔Test↔Evidenz-Kette und ohne offene `FAIL`/`BLOCKED` erlaubt; automatische Freigabe verboten (`validationApprovePermission` bleibt ungewährt).
6. **AC-6 (Version immutable verknüpft):** URS-`baselineVersion` **und** Produkt-`version` sind auf `validation_runs`/`validation_evidence` als Felder persistiert und nach Erstellung unveränderlich.
7. **AC-7 (Change-Impact):** Änderung der URS-Baseline oder der Produkt-Version eines bereits `RELEASED`-Kontexts erzwingt einen neuen Kontext bzw. `REQUALIFICATION_REQUIRED`.
8. **AC-8 (Server-side Gate):** Die Produkt-/Versionspflicht wird in `service.createRun`/`createContextFromApprovedUrs` erzwungen — nicht nur im Frontend (`ProtocolPages.tsx`/`ContextPages.tsx`).
9. **AC-9 (Audit):** Run-Start, Test-Ergebnis, Evidenz-Anlage und Freigabe schreiben einen Audit-Datensatz (analog `composer_audit_events`).
10. **AC-10 (UI bindet Produkt):** Der Validation-Start-Flow verlangt Auswahl/Referenz eines konkreten Produkts + Version; der hartcodierte `'platform-core-v1.0-rc2'` ist entfernt.

---

## 8. Fehlende Testfälle

Benannte Negativtests (gefordert, derzeit **nicht** vorhanden):

1. **Validierungsstart ohne Produkt/Solution abgelehnt** — fehlt. (Bestand: `service.test.ts`/`validation-context-integration.test.ts:133-149` zeigen nur den Positiv- bzw. URS-Gate-Fall, keinen Produkt-Gate-Fall.)
2. **Testfall ohne Produkt-/Version abgelehnt** — fehlt. (`startTest` prüft nur `unknown test`/`EXTERNAL`, `service.ts:403-416`.)
3. **Evidenz ohne aktive Validierungsinstanz abgelehnt** — fehlt bzw. wird durch `technical-evidence.test.ts:12` („creates technical CI evidence **without** a validation run") aktiv **widersprochen**. Es muss ein Negativtest ergänzt werden, der die Ablehnung bei fehlender aktiv/EXECUTABLE-Instanz abdeckt.
4. **Freigabe/Release ohne vollständige Traceability abgelehnt** — fehlt im Validation Manager (existiert nur produktseitig als Release-Gate, `composer-backend/src/service.ts:842-1002`; ein Validation-seitiger Approve/Release-Endpoint existiert gar nicht).
5. **Versionswechsel erzeugt Neuvalidierung / Requalification-required** — fehlt (kein Zustand, kein Test).

Zusätzlich identifizierte fehlende Tests:

6. **`WAITING_FOR_SOLUTION`-Zustandsübergänge:** legal (Zuweisung Produkt/Version) und illegal (Tests/Evidenz in `WAITING_FOR_SOLUTION`).
7. **Server-side Produkt-Gate in `createRun`:** ein Run ohne `productVersionId` muss `service.createRun` (nicht nur Router) abweisen.
8. **Unveränderlichkeit der Produkt-/URS-Versionsreferenz** nach Run-Erstellung (analog bestehendem Test F, `validation-context-integration.test.ts:188-196`, aber für Produkt/Version).
9. **Evidenzträger gehören zu aktivem Run/Produkt:** Evidenz darf nicht einem anderen Produkt/Version zugeordnet werden.
10. **Kontext kann ohne Produkt nur `DRAFT`-Plan + `WAITING_FOR_SOLUTION`,** und `getContextRequirements` (read-through) funktioniert weiterhin im wartenden Zustand.
11. **Produkt-Version ohne APPROVED URS darf keinen aktiven Validation-Kontext erzeugen** (Umkehrrichtung des Composer-Release-Gates in die Validation-Ebene).

---

## 9. Remediation (umgesetzt)

> Stand 2026-09-13, nach der Implementierung des P0 Product-/Version-Gatings. Alle Änderungen liegen in der Nexora-Extension-Schicht (Validation Expert Plugin + `@internal/platform-common`-Vertrag); Backstage Core wurde nicht angefasst.

### 9.1 Behebung der P0-Lücken (1–4)

**P0-1 — Validation Context ohne Produkt/Version erzeugbar → BEHOBEN.**
- Neuer Status `WAITING_FOR_SOLUTION` als Initialzustand: `packages/platform-common/src/validation-integration.ts` (`VALIDATION_CONTEXT_STATUSES`), `plugins/validation-expert-backend/src/service.ts` (`createContextFromApprovedUrs` setzt `WAITING_FOR_SOLUTION` + Audit-Event `CONTEXT_CREATED`).
- Kontext trägt jetzt `productRef` (`ValidationContextProductRef`: `productId`, `productVersionId`, `productBaselineId` + Anzeigenamen/Snapshot) — Vertrag in `validation-integration.ts`, Persistenz in `db/migrations.ts` (`validation_contexts.product_id`/`product_version_id`/`product_baseline_id`/`product_ref jsonb`).

**P0-2 — Run/ausführbare Tests ohne Produkt/Version startbar → BEHOBEN.**
- `service.createRun` verlangt jetzt zwingend `contextId` (sonst `ConflictError` → HTTP 409) und prüft `assertContextExecutable` (Status ∈ {`READY_FOR_VALIDATION`, `ACTIVE`} **und** vollständige Produktreferenz). Der freie String `candidate` ist nur noch Display-Label, abgeleitet aus `productName@productVersion`; die Produkt-/Versions-IDs werden immutable auf den Run gesnapshotted (`validation_runs.product_id/product_version_id/product_baseline_id`).
- Router `POST /runs` verlangt `contextId`, `respondError` mappt `ConflictError` auf 409.
- Hartcodiertes `'platform-core-v1.0-rc2'` entfernt: `ContextPages.tsx` (startet Run nur noch aus Context) und `ProtocolPages.tsx` (Start-Button ersetzt durch Hinweis auf Contexts).

**P0-3 — Testausführung & Evidenz ohne aktive Instanz mit Produkt → BEHOBEN.**
- `executeAutomated`, `startTest`, `recordManualResult` laufen durch `requireRunContextExecutable` → der Kontext des Runs wird geladen und `assertContextExecutable` geprüft (Server-seitig; direkte HTTP-Aufrufe scheitern ebenfalls).
- `addEvidence` snapshotted `productId/productVersionId/productBaselineId/ursBaselineId` auf jeden Evidenzträger (`validation_evidence`-Spalten).

**P0-4 — Evidenz ganz ohne Run/Kontext/Produkt anlegbar → BEHOBEN.**
- `registerTechnicalEvidence` verlangt jetzt `productId/productVersionId/productBaselineId` im Reference-JSON, löst den zugehörigen Kontext via `findContextByProductRef` auf und prüft `assertContextExecutable`; ohne passenden Live-Kontext → `ConflictError`. (Der Composer→Validation-Registrar `evidence-registrar.ts` bleibt kompatibel: er sendet bereits Produkt-Referenzen im Reference.)

### 9.2 Behebung der P1-Lücken (5–6)

**P1-5 — Fehlende immutable Produkt-/Versionsreferenz → BEHOBEN.**
- `validation_runs`, `validation_evidence` und `validation_contexts` tragen jetzt Produkt-/Versionsspalten (Migration idempotent; Alt-Datensätze ohne Produkt-Referenz werden dadurch korrekt gesperrt, nicht stillschweigend befüllt).
- Unique-Constraint auf `(requirement_set_id, baseline_id)` ersetzt durch partiellen Index `validation_contexts_live_source_uq … WHERE status <> 'SUPERSEDED'`, damit Requalification-Kontexte für dieselbe URS-Baseline angelegt werden können.

**P1-6 — Keine Server-seitige Zustandsmaschine → BEHOBEN.**
- Neue Statusmaschine `CONTEXT_TRANSITIONS` in `service.ts`: `DRAFT → {WAITING_FOR_SOLUTION, READY_FOR_VALIDATION}`; `WAITING_FOR_SOLUTION → READY_FOR_VALIDATION`; `READY_FOR_VALIDATION → {WAITING_FOR_SOLUTION, ACTIVE, SUPERSEDED}`; `ACTIVE → {READY_FOR_VALIDATION, WAITING_FOR_SOLUTION, UNDER_REVIEW, SUPERSEDED}`; `UNDER_REVIEW → {APPROVED, REJECTED, SUPERSEDED}`; `APPROVED → SUPERSEDED`; `REJECTED → {READY_FOR_VALIDATION, SUPERSEDED}`; `SUPERSEDED → ∅`. Illegale Transitionen → `ConflictError`.
- Neue Aktionen: `assignProduct` (WAITING_FOR_SOLUTION→READY_FOR_VALIDATION, validiert gegen Product Composer), `removeProduct` (→WAITING_FOR_SOLUTION), automatisch `ACTIVE` beim ersten Run, `submitReview` (ACTIVE→UNDER_REVIEW mit Traceability-Gate), `approveContext`/`rejectContext` (nur aus UNDER_REVIEW, menschlich, nie automatisch).

### 9.3 Behebung der P2/P3-Lücken (7–10)

**P2-7 (Product-Seiten nicht mit Validation verdrahtet):** teilweise adressiert — die Kontext-Detailseite zeigt jetzt die zugeordnete Produkt-Lösung (Name, Version, Baseline, IDs, Zuordner/Zeitpunkt) und bietet in `WAITING_FOR_SOLUTION` das Zuordnungsformular. Der Product-Composer-Sidebar-Eintrag bleibt als eigener UI-Punkt offen (nicht Teil des P0-Gatings).

**P2-8 (Direkte API-Aufrufe als Bypass):** BEHOBEN — alle Gates liegen im Service (nicht im Router/Frontend); `product-gating.test.ts` weist die Ablehnung auf Service-Ebene nach.

**P3-9 (Audit-Trail fehlt):** BEHOBEN — neue Tabelle `validation_context_audit` (id, context_id, event_type, actor, details jsonb, created_at) + Events: `CONTEXT_CREATED`, `PRODUCT_ASSIGNED`, `PRODUCT_REMOVED`, `CONTEXT_ACTIVATED`, `RUN_CREATED`, `TEST_STARTED`, `TECHNICAL_EVIDENCE_REGISTERED`, `REVIEW_SUBMITTED`, `CONTEXT_APPROVED`, `CONTEXT_REJECTED`, `CONTEXT_SUPERSEDED`, `CONTEXT_CREATED_FOR_REQUALIFICATION`. Endpoint `GET /contexts/:id/audit`, Anzeige im UI („Audit trail“).

**P3-10 (Change-Impact/Requalifizierung fehlt):** BEHOBEN — Wechsel von `productVersionId`/`productBaselineId` in `ACTIVE`/`UNDER_REVIEW`/`APPROVED` setzt den alten Kontext auf `SUPERSEDED` und legt einen neuen Requalification-Kontext (`READY_FOR_VALIDATION`) an; bestehende Runs/Evidenz bleiben auf der alten Version verknüpft (nie umgehängt). Der Product-Composer-seitige `ProductChangeSignal`-Flow bleibt davon unberührt.

### 9.4 Produkt-Resolver (HTTP-Boundary, keine Parallel-Tabellen)

- Neuer `createHttpProductComposerResolver` (`plugins/validation-expert-backend/src/product-resolver.ts`): validiert eine Zuweisung über die Product-Composer-API (OBO-Token): Product existiert (`GET /products/:id`), ProductVersion gehört zum Product (`GET /products/:id/versions`), ProductBaseline gehört zur Version **und** ist `APPROVED` (`GET /baselines/:id`), und ein ggf. gepinnter `ursBaselineId` muss zur Kontext-Baseline passen. Verstöße → `ConflictError`/`NotFoundError`.
- Verdrahtung in `plugin.ts`: `productResolver: createHttpProductComposerResolver({ discovery, auth })`.

### 9.5 Abdeckung der Akzeptanzkriterien (Abschnitt 7)

| AC | Status | Nachweis |
|---|---|---|
| AC-1 (Ungültiger Start → 409, kein Run) | BEHOBEN | `product-gating.test.ts` Fall 2; `service.test.ts` „rejects creating a run without a validation context“ |
| AC-2 (WAITING_FOR_SOLUTION, ausführbare Endpoints gesperrt) | BEHOBEN | `product-gating.test.ts` Fälle 1, 3, 6b; `validation-context-integration.test.ts` Fall A |
| AC-3 (Test-Start auf nicht-aktivem Kontext abgelehnt) | BEHOBEN | `product-gating.test.ts` Fall 3 (`executeAutomated`/`recordManualResult` nach Produkt-Entzug) |
| AC-4 (Evidenz ohne aktive Instanz abgelehnt) | BEHOBEN | `technical-evidence.test.ts` (3 Negativfälle + Positivfall mit Audit-Event) |
| AC-5 (Freigabe nur bei vollständiger Traceability) | BEHOBEN | `submitReview`-Gate (Coverage vollständig, ≥1 COMPLETED Run, keine FAIL/BLOCKED, keine offenen Findings); `product-gating.test.ts` Fall 5; Approve nur aus UNDER_REVIEW |
| AC-6 (Version immutable verknüpft) | BEHOBEN | Snapshot auf Run/Evidenz/Kontext; Supersession hängt nichts um (`product-gating.test.ts` Fall 6) |
| AC-7 (Change-Impact → Requalification) | BEHOBEN | `product-gating.test.ts` Fall 6 (SUPERSEDED + neuer Kontext) |
| AC-8 (Server-side Gate) | BEHOBEN | Gates in `service.createRun`/`assertContextExecutable`/`registerTechnicalEvidence` |
| AC-9 (Audit) | BEHOBEN | `validation_context_audit` + 12 Event-Typen + UI-Anzeige |
| AC-10 (UI bindet Produkt, Hardcode entfernt) | BEHOBEN | `ContextPages.tsx` (Zuordnungsformular, Button-Gating, Produkt-Anzeige), `ProtocolPages.tsx` (Hardcode entfernt) |

### 9.6 Geforderte Tests (Abschnitt 8) — implementiert und grün

1. Validierungsstart ohne Produkt abgelehnt → `product-gating.test.ts` Fall 2 ✔
2. Testfall ohne Produkt/Version abgelehnt → `product-gating.test.ts` Fall 3 ✔
3. Evidenz ohne aktive Instanz abgelehnt → `technical-evidence.test.ts` (Negativtests) ✔
4. Freigabe ohne vollständige Traceability abgelehnt → `product-gating.test.ts` Fall 5 ✔
5. Versionswechsel erzeugt Requalification → `product-gating.test.ts` Fall 6 ✔
6. `WAITING_FOR_SOLUTION`-Transitionen legal/illegal → `product-gating.test.ts` Fälle 1, 3, 6b ✔
7. Server-seitiges Gate in `service.createRun` → `service.test.ts` + `product-gating.test.ts` Fall 2 ✔
8. Unveränderlichkeit der Produkt-/Versionsreferenz → `product-gating.test.ts` Fall 6 (alter Run behält `version-1`) ✔
9. Evidenzträger gehören zu aktivem Produkt → `technical-evidence.test.ts` (Match via `findContextByProductRef`; fremde Version → abgelehnt) ✔
10. Kontext ohne Produkt: nur Plan/Read-through → `validation-context-integration.test.ts` (read-through im wartenden Zustand funktioniert weiter) ✔
11. Produkt ohne APPROVED-Baseline → `product-gating.test.ts` Fall 4b (Nicht-APPROVED-Baseline abgelehnt) ✔

### 9.7 Testergebnisse (2026-09-13)

| Suite | Ergebnis |
|---|---|
| `@internal/plugin-validation-expert-backend` | **46/46 passed** (inkl. neu: `product-gating.test.ts` 8 Tests, `technical-evidence.test.ts` 5 Tests) |
| `@internal/plugin-validation-expert` (Frontend) | **28/28 passed** |
| `@internal/plugin-composer-backend` | **89/89 passed** (evidence-registrar kompatibel) |
| `@internal/platform-common` | **156/156 passed** |
| ESLint (validation-expert, validation-expert-backend) | clean |
| `tsc --noEmit` (Repo) | 3 vorbestehende Fehler in `urs-composer-backend` (unberührt): `db/seeds.ts:28`, `wd-seed-persistence.test.ts:149` (2×) |

### 9.8 Geänderte Dateien

**Vertrag:**
- `packages/platform-common/src/validation-integration.ts` — Statusliste, `ValidationContextProductRef`, `AssignProductRequest`, `ValidationContextAuditEvent`, `ValidationContext.productRef`
- `packages/platform-common/src/index.ts` — neue Exports

**Backend (Validation Expert):**
- `plugins/validation-expert-backend/src/types.ts` — Run-/Evidenz-Referenzfelder, Re-Exports
- `plugins/validation-expert-backend/src/db/migrations.ts` — neue Spalten, partieller Unique-Index, `validation_context_audit`
- `plugins/validation-expert-backend/src/repository.ts` / `postgres-repository.ts` — Context-Update, `findContextByProductRef`, Audit-Persistenz, Produkt-Spalten
- `plugins/validation-expert-backend/src/product-resolver.ts` — NEU: HTTP-Boundary zum Product Composer
- `plugins/validation-expert-backend/src/service.ts` — State-Machine, `assignProduct`/`removeProduct`/`submitReview`/`approveContext`/`rejectContext`, Guards, Audit, Supersession
- `plugins/validation-expert-backend/src/router.ts` — neue Endpoints, `contextId`-Pflicht bei `POST /runs`, 409-Mapping
- `plugins/validation-expert-backend/src/plugin.ts` — Verdrahtung `productResolver`

**Frontend (Validation Expert):**
- `plugins/validation-expert/src/api.ts` — neue Methoden, `createRun(type, {contextId})`, `ValidationContext.productRef`
- `plugins/validation-expert/src/components/ContextPages.tsx` — Produkt-Anzeige, Zuordnungsformular, Review/Approve/Reject, Button-Gating, Audit-Trail
- `plugins/validation-expert/src/components/ProtocolPages.tsx` — hartcodierten Kandidaten entfernt, Start nur noch via Context

**Tests:**
- `plugins/validation-expert-backend/src/product-gating.test.ts` — NEU: 8 Tests (6 Pflichtfälle + 2 Zusatzfälle)
- `plugins/validation-expert-backend/src/technical-evidence.test.ts` — auf Gating umgestellt
- `plugins/validation-expert-backend/src/validation-context-integration.test.ts` — Status/Assign-Produkt angepasst
- `plugins/validation-expert-backend/src/service.test.ts` — Runs jetzt context-gebunden
- `plugins/validation-expert/src/components/ContextPages.test.tsx` — Fixture angepasst

### 9.9 Bewusst offene Punkte (nicht Teil des P0-Gatings)

- Alt-Datensätze (z. B. Kontext mit altem Status `PENDING`, Runs ohne Produkt-Referenz) werden nach dem Update korrekt **gesperrt** (Gate greift), aber nicht automatisch migriert/befüllt — ggf. manuelle Bereinigung/Neuaufsetzen.
- Product-Composer-Eintrag in der Haupt-Sidebar (P2-7, UI-Teil) bleibt offen.
- `ProductChangeSignal` aus dem Product Composer löst (noch) keinen automatischen Requalification-Flow aus — der Versionswechsel ist validation-seitig über `assignProduct` abgedeckt.

