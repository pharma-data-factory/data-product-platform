# NEXORA / NEXORA — REFACTORING- & SIMPLIFICATION-PLAN

**Status:** PLAN — NO CODE CHANGED
**Datum:** 2026-08-29
**Basis:** Fundamentalanalysen `ARCHITECTURE_BASELINE_V1_REPORT.md`, `PORTAL_EXPERIENCE_SIMPLIFICATION_REPORT.md` + frische Voll-Analyse des Codes (Navigation, 20 Plugins, RBAC, Backend-Routen, Dead Code, Datenmodelle, Config, Root-Dokumente) vom 2026-08-29.
**Kernel:** Backstage 1.53 bleibt unveränderter Plattform-Kernel (AGENTS.md Prime Directive).

---

## 0. RAHMEN & SICHERHEITSREGELN

1. **Kein Backstage-Core-Change.** Keine `@backstage/*`-Änderung, kein Patching, kein Fork.
2. **Keine Dependency-Version ändern.** Kein `yarn add/up`, kein `yarn.lock`-Touch, keine Resolution-Änderung. Jest-Reparatur in Wave 0 ist eine Ausnahme und **genehmigungspflichtig** (`DEPENDENCY_CHANGE_REQUIRED`).
3. **Keine Daten löschen.** DB-Cleanup nur als Plan (Abschnitt 6); Ausführung erst nach separater Freigabe.
4. **Keine Permissions entfernen**, bevor Verwendung vollständig nachgewiesen ist (Wave 2-Regel).
5. **Keine Plugins löschen**, bevor Referenzfreiheit nachgewiesen ist (Wave 3/4).
6. **Bestehende uncommittete Änderungen** (Portal-Experience-Gate, Guardrails, RBAC-Migration u. a.) werden nicht überschrieben; Wave 0 inventarisiert sie und der User entscheidet über Commits.
7. **Nichts commiten / pushen** ohne explizite Freigabe.
8. Jede Wave endet mit `tsc` + Tests + (bei UI-Änderungen) Browser-Verifikation.

---

## 1. TARGET USER EXPERIENCE

### 1.1 Persona-Bedarf (aus dem Code abgeleitet)

| Persona | Braucht wirklich | Braucht NICHT |
|---|---|---|
| **End User (alle)** | Home, Produkte entdecken (Marketplace/Golden Paths), eigene Produkte sehen, Qualität/Status einsehen | Build-Interna, Admin, Plugin-Inventar |
| **Developer** | Build-Journey (Scaffolder, Golden Paths, Components, Composer), Developer Resources | RBAC, Entitlements, Validation-Review |
| **Validator / Quality** | Validate (URS → Validation → Evidence), Qualitätssichten | Build, Marketplace-Admin, Plattform-Architektur |
| **Product Owner** | My Products (Governance, Zertifizierung), Discover | Validierungs-Durchführung, Plattform-Admin |
| **Platform Admin** | Admin-Hub (RBAC, Entitlements, Integration, Plugin Directory, Architektur) | — |

**Heutige Redundanzen (Code-Beweis):**
- `nexora-contracts` / `nexora-quality` / `nexora-assets` sind drei dünne Sichten über **dieselben Catalog-`Component`-Entities** (`isIndustrialDataProduct`-Filter) — keine eigenen Backends.
- "Equipment" existiert **dreifach**: `nexora-assets` (`/equipment`, Catalog), `app/assets` (`/assets`, AAS-Backend), `model-company` `/equipment` (Simulation).
- `data-products` (`/data-products`) und Standard-`/catalog` zeigen dieselben Entities — gewollt (Produktansicht vs. autoritative Sicht), aber die Produktansicht gehört zu My Products, nicht als zweiter Catalog.
- Technische Plugins in der Hauptnavigation: **Plugin Directory** (Governance-Inventar) ist zusätzlich im Build-Hub verlinkt und gehört ausschließlich zu Admin.
- **`/rbac`** ist eine tote UI (Community-RBAC-Frontend gemountet, Backend bewusst deaktiviert — `packages/backend/src/index.ts:29-32`), liefert 403 und gehört nicht in die Navigation.

### 1.2 CURRENT → TARGET NAVIGATION

**CURRENT (implementiert, uncommittet):**

```
Search | Home | Build▸(Start Building·Golden Paths·Components·Composer[Adv])
My Products▸(Data Products·Catalog) | Validate▸(URS Composer·Validation Expert)
Marketplace | Model Company | Admin▸(RBAC·Entitlements·Marketplace Integration·
Platform Architecture·Plugin Directory·Platform Settings) | Settings▸(My Access)
```
Orphan-Routen (nur über Hub-Karten erreichbar): `/contracts`, `/quality`, `/equipment`, `/assets`, `/developer`, `/platform/architecture*`.

**TARGET (6 Tiers + Settings):**

```
Home            → /
Discover        → Marketplace · Golden Paths · Model Company (Demo)
Build           → Start Building · Components · Assets & Sensors · Composer [Advanced] · Developer Resources
My Products     → Data Products · Catalog
Validate        → URS Composer · Validation Expert
Operate         → Quality · Equipment · Contracts        (NEU: eigener Hub)
Admin           → RBAC-frei: Entitlements · Marketplace Integration · Platform Architecture · Plugin Directory · Platform Settings
Settings        → Settings · My Access
```

- **Discover** ersetzt den Top-Level-"Marketplace" als breiteres Entdecken-Eintrittstor; Marketplace bleibt das Kernprodukt darin.
- **Model Company** bleibt Plugin und Inhalt, wird aber als **Demo** deklariert und in Discover herabgestuft (heute Top-Level, was einer Demo zu viel Gewicht gibt).
- **Operate** ist ein neuer Hub für Quality/Equipment/Contracts. **Ehrliche Einordnung:** diese Sichten sind heute katalogabgeleitet (kein Live-Betriebsdaten-Backend). Der Hub schafft den richtigen Zielzustand; echtes Betriebsdaten-Backend ist bewusst NICHT Teil dieses Plans.
- **Golden Paths** (`/releases`) erscheint unter Discover UND bleibt als Karte auf dem Build-Hub (eine Route, zwei Einstiege).

### 1.3 Routen-Migrationstabelle

| Route | Heute | Ziel | Aktion |
|---|---|---|---|
| `/` | Home | Home | bleibt |
| `/build` | Build | Build | bleibt |
| `/create` | Build ▸ Start Building | Build ▸ Start Building | bleibt (Standard-Scaffolder) |
| `/releases`, `/releases/:templateId` | Build ▸ Golden Paths | Discover ▸ Golden Paths (+ Build-Hub-Karte) | Nav-Item verschieben |
| `/platform-components(/:name)` | Build ▸ Components | Build ▸ Components | bleibt |
| `/compose` | Build ▸ Composer [Adv] | Build ▸ Composer [Advanced] | bleibt |
| `/assets(/:assetId/...)` | nur Build-Hub-Karte | Build ▸ Assets & Sensors | in Submenu aufnehmen |
| `/developer` | nur Build-Hub-Karte | Build ▸ Developer Resources | in Submenu aufnehmen |
| `/marketplace(/:id)` | Top-Level | Discover ▸ Marketplace | Label/Tier-Wechsel (Route unverändert) |
| `/model-company` + 14 Subseiten | Top-Level | Discover ▸ Model Company (Demo) | Tier-Wechsel, Subseiten intern |
| `/my-products` | My Products | My Products | bleibt |
| `/data-products(/:name)` | My Products ▸ Data Products | My Products ▸ Data Products | bleibt |
| `/catalog` | My Products ▸ Catalog | My Products ▸ Catalog | bleibt (Standard) |
| `/contracts(/:name)` | My-Products-Hub-Karte (orphan) | **Operate ▸ Contracts** | Hub-Zuordnung wechseln |
| `/quality(/:name)` | My-Products-Hub-Karte (orphan) | **Operate ▸ Quality** | Hub-Zuordnung wechseln |
| `/equipment(/:name)` | My-Products-Hub-Karte (orphan) | **Operate ▸ Equipment** | Hub-Zuordnung wechseln |
| `/validate` | Validate | Validate | bleibt |
| `/urs-composer` + 4 Subseiten | Validate ▸ URS Composer | Validate ▸ URS Composer | bleibt |
| `/validation-expert` + 12 Subseiten | Validate ▸ Validation Expert | Validate ▸ Validation Expert | bleibt |
| `/admin` | Admin (admin only) | Admin (admin only) | bleibt |
| `/admin/entitlements`, `/admin/marketplace-integration`, `/admin/platform-architecture` | Admin | Admin | bleibt |
| `/plugin-directory(/:id)` | Admin ▸ + Build-Hub-Karte | **nur Admin** | Build-Hub-Link entfernen |
| `/rbac` | Admin ▸ RBAC (tote UI, Backend aus) | **entfernt** (Wave 2) | App-Mount + Nav-Link entfernen |
| `/settings`, `/access` | Settings ▸ | Settings ▸ | bleibt |

Keine einzige Route wird in Wave 1 gelöscht — nur Tier-Zuordnung und Sichtbarkeit ändern sich.

---

## 2. PLUGIN CONSOLIDATION

Legende: KEEP / MERGE / HIDE FROM NAVIGATION / REFACTOR / DEPRECATE / REMOVE.
UI-Konsolidierung (Navigation) und technische Konsolidierung (Code) getrennt bewertet. **Nichts wird jetzt gelöscht** — REMOVE = geplante Entscheidung einer späteren Wave mit Verifikationspflicht.

| Plugin / Modul | UI | Technisch | Begründung (Code-Beweis) |
|---|---|---|---|
| `data-products` (+backend) | KEEP (My Products) | **REFACTOR** | Kern-Produktansicht. Backend hat UNUSED-Routen: `/consume/*` (Fixtures, 0 Caller), `/releases`, `/releases/transition` (0 Caller) → Wave 3 entfernen. |
| `marketplace` | KEEP (Discover-Kern) | KEEP | Entdecken/Kommerz-Kern; einziger Konsument von `entitlements`-API. |
| `model-company` (+backend) | **HIDE/DEMOTE** (Discover ▸ Demo) | KEEP | Vollwertige Simulation mit eigenem Backend; aber Demo, kein Produktweg → nicht Top-Level. |
| `nexora-common` | — (Library) | KEEP | Shared UI-Library der nexora-Familie. |
| `nexora-assets` (`/equipment`) | KEEP (Operate) | **MERGE** (App-`assets`-Modul einziehen) | Catalog-Sicht auf Equipment; das AAS-App-Modul (`modules/assets/aasClient.ts` + Pages) gehört als Frontend-Plugin daneben — heute WRONG LAYER (API-Client im App-Paket). |
| `nexora-contracts` (`/contracts`) | KEEP (Operate) | KEEP | Dünne Catalog-Sicht; keine Doppel-Infrastruktur. |
| `nexora-quality` (`/quality`) | KEEP (Operate) | KEEP | Dito. |
| `nexora-backend` | — | KEEP | Mock/Proxy für Industrieprovider (Remote-Modus vorhanden); keine Aufblähung. |
| `plugin-directory` (+backend) | **HIDE FROM NAVIGATION** (nur Admin) | KEEP | Governance-Inventar; gehört nicht in den Developer-Hub (Build-Hub-Link entfernen). |
| `urs-composer` (+backend) | KEEP (Validate) | KEEP (+ **REFACTOR**: Signatur-Mismatch prüfen) | Kern-Domain, einziges PG-persistiertes Plugin. `createBaseline`-Signatur-Mismatch (router.ts:536 vs. service.ts:705) verifizieren/fixen. |
| `validation-expert` (+backend) | KEEP (Validate) | KEEP | Echte Validierungs-Engine; URS-Integration korrekt über HTTP (kein Cross-Plugin-DB-Zugriff). |
| `validation-manager` (+backend) | — (kein Mount, keine Routen) | **REMOVE** (Wave 4) | Tot: Frontend ohne `plugin.tsx`/Routen und NICHT in App.tsx registriert; Backend-Router nur TODO-Stubs und importiert nicht existierende `./services/requirementService|auditService`. `validation-expert` deckt die Domäne real ab. |
| `entitlements-backend` | KEEP (Admin/My Access) | **REFACTOR** | Kommerzielle Berechtigungen (nicht RBAC). Belt-and-suspenders Rollen-Check (`router.ts:329,368`) auf Framework-Check vereinheitlichen (Wave 2). Zwei parallele In-Memory-Stores (links/registrations) dokumentieren. |
| `authorization-registry-backend` | — (keine Seite) | **REMOVE** (Wave 4) | 0 Konsumenten (kein API-Client im Repo), in-memory YAML-Scan, Drift: `authorization.yaml`-Permissions (`aas.operate`…) existieren nicht in `permissions.ts`; Rollen-Mappings lowercase ≠ `PLATFORM_ROLES`. Kein Entscheidungs-Engine-Verlust. |
| `aas` (in `packages/backend/src/aas/`) | KEEP (Build ▸ Assets) | **REFACTOR** → `plugins/aas-backend` | Komplettes Backend-Plugin (Router+Repository) liegt im Core-Paket — klare WRONG-LAYER-Verletzung. API bleibt identisch (pluginId `aas`). |
| App-Module (`architecture`, `legal`, `developer-hub`, `platform-components`, `composer`, `releases`, `home`, `build`, `my-products`, `validate`, `admin`, `search`, `identity`, `create`, `nav`, `theme`) | KEEP | KEEP | Kompositions-/Präsentationsschicht; erlaubt laut AGENTS.md. Keine signifikante Domänenlogik (außer `assets/aasClient.ts` → MERGE s. o.). |
| `entitlements`-App-Modul (4 Seiten) | KEEP | KEEP | Admin/My-Access-Seiten; bleiben App-Module (Grenze: keine Backend-Logik). |

**Ergebnis:** 1 REMOVE-Paar (validation-manager), 1 REMOVE-Backend (authorization-registry), 1 MERGE (assets→nexora-assets), 1 Layer-Verschiebung (aas), sonst KEEP mit gezielten REFACTORs. Kein Nutzer-Feature geht verloren.

---

## 3. RBAC / PERMISSION TARGET MODEL

### 3.1 CURRENT MODEL (verifiziert)

Rollen (`platform-common/src/roles.ts`) — Gruppen → Rolle:
`platform-viewers`→VIEWER, `data-product-developers`→DEVELOPER, `data-product-owners`→DATA_PRODUCT_OWNER, `platform-admins`→PLATFORM_ADMIN.

Permission-Sets (`permissions.ts:260-325`):
- VIEWER: 15 Read-Permissions (inkl. `validation.read`, `requirement.read`, `traceability.read`, `urs.read` — Lesen für alle!)
- DEVELOPER: + Scaffolder/`data-product.create`/`validation.run.start`/`validation.test.execute`/`urs.create`
- OWNER: + `data-product.governance`/`certification.manage`/`aas.manage`/**`validation.review`**/`urs.manage`/`urs.approve`
- ADMIN: + 10 Admin-Permissions; `validation.approve`, `risk.accept`, `baseline.modify` bewusst ausgelassen und in `policy.ts:46-52` hard-denied.

Policy: `PlatformPermissionPolicy` (`packages/backend/src/permission/policy.ts`) = RBAC + **Entitlement-Gate** + Release-Gate (`OK|RBAC|ENTITLEMENT|RELEASE`). Community-RBAC-Backend deaktiviert (Konflikt "Policy already set"), Frontend trotzdem gemountet (`/rbac` → 403).

### 3.2 Befunde (Duplikate, Konflikte, Bypässe)

1. **URS-Permissions doppelt definiert:** `permissions.ts:190-217` UND `permissions/urs.ts:18-45` (gleiche Namen).
2. **Validation-Permissions doppelt definiert:** `permissions.ts:93-151` UND `permissions/validation.ts:20-66` (zweites Set ohne `risk.accept`/`baseline.modify`).
3. **Kein Validator/Quality-Role:** `validation.review`/`urs.approve` hängt am DATA_PRODUCT_OWNER — ein PO ist kein GxP-Reviewer. Zielmodell (User-Vorgabe) verlangt die Trennung.
4. **Obsolete Permissions:** `validation.approve`, `risk.accept`, `baseline.modify` = definiert, exportiert, hard-denied, nirgends granted → tote Guards.
5. **Checks außerhalb des Permission Frameworks** (UI-Rollen-Gating, meist legitim):
   - Sidebar/`UserProfileMenu`/`LandingSignInPage`/`EntitlementsAdminPage`/`MarketplaceIntegrationPage`/`AssetsPage`/`BuildLandingPage`/`HomePage`/`DeveloperHubPage`/`MarketplacePage`/`PluginDirectoryPage` — `resolvePlatformRole`/`canAdministerPlatform`/`canManageAas`/`canReadPluginDirectory`.
   - **Backend-Hybrid (unschön):** `entitlements-backend/src/router.ts:329,368` re-checkt `resolvePlatformRole(...)==='PLATFORM_ADMIN'` ZUSÄTZLICH zum Framework-`entitlementAdminPermission`.
6. **Naming-Drift:** `data-product.*` vs. `pluginDirectory.*` vs. `golden-path.release.manage` (kebab/camel gemischt); Inventory-Doku (`permissions-inventory.md`) widerspricht teils dem Code (`pluginDirectory.read` angeblich Viewer, real DEVELOPER).
7. **`/rbac` tote UI** (Backend deaktiviert) suggeriert ein funktionierendes Admin-Tool.

### 3.3 TARGET MODEL

| Rolle | Gruppe (Catalog) | Kern-Permissions |
|---|---|---|
| **User** (= VIEWER) | `platform-viewers` | unverändert: alle Read-Views, `marketplace.view`, `data-product.consume` |
| **Developer** | `data-product-developers` | unverändert: + Scaffolder, `data-product.create`, `validation.run.start`, `validation.test.execute`, `urs.create` |
| **Product Owner** | `data-product-owners` | **ohne** `validation.review`, `urs.approve`: + `data-product.governance`, `data-product.certification.manage`, `aas.manage`, `urs.manage` |
| **Validator / Quality** | **NEU** `validators` (oder `quality`) | `validation.read/review/approve/run.start/test.execute`, `requirement.read`, `traceability.read`, `risk.accept`?, `baseline.modify`?, `urs.read/create/manage/approve` |
| **Platform Admin** | `platform-admins` | unverändert: alle `.admin`-Permissions, `platform.admin`, `template.admin`, `golden-path.release.manage` |

Entscheidungen:
- `validation.approve`/`risk.accept`/`baseline.modify`: nach Verwendungsnachweis (erwartet: 0) **entfernen**; bis dahin dokumentierte Guards. `validation.approve` kann als aktive Permission der Validator-Rolle wiederbelebt werden, wenn der Approval-Workflow sie braucht.
- `data-product.viewValidation` (VIEWER-Set) bleibt: Sichtbarkeit des Validierungsstatus für alle ist gewollt.
- Permission-Katalog: **eine Quelle** (`permissions.ts`); `permissions/urs.ts` + `permissions/validation.ts` löschen und durch Re-Exports ersetzen ODER alle Importe auf `permissions.ts` umstellen (Empfehlung: Imports umstellen, Dateien löschen — keine Re-Export-Shims).
- Backend-Checks: Framework-only; belt-and-suspenders-Check in entitlements-backend entfernen.
- `/rbac`: App-Mount + Nav-Link entfernen; Entscheidung "Community-RBAC vs. eigene Policy" explizit dokumentieren → Empfehlung: eigene `PlatformPermissionPolicy` behalten (Entitlement-/Release-Gate ist dort verankert), Community-RBAC-UI erst reaktivieren, wenn das Backend konsolidiert übernommen wird.
- Frontend-`canX`-Prädikate (`policy.ts`, 25 Stück): aus den Permission-Sets ableiten statt hartkodieren (Wave 2, risikoarm).

### 3.4 MIGRATION REQUIRED (Reihenfolge = Sicherheit)

1. **Additiv:** Rolle `VALIDATOR` + Gruppe `validators` + Set + `examples/org.yaml`-Beispiel + Tests. (Nichts wird enger.)
2. OWNER-Set um `validation.review`/`urs.approve` bereinigen (Validatoren in der neuen Gruppe müssen zuerst existieren → Reihenfolge einhalten).
3. Duplikat-Quellen konsolidieren (Import-Umstellung + Löschung).
4. Obsolete hard-denied Permissions entfernen (nach Grep-Verifikation: 0 Grants/Checks).
5. Backend-Hybrid-Check entfernen; `/rbac`-Mount entfernen.
6. Doku (`docs/identity-and-rbac.md`, `permissions-inventory.md`) auf Ist-Stand bringen.

---

## 4. BACKEND SIMPLIFICATION

### 4.1 Dependency Map (Frontend → Router → Service → Repository → DB)

| Plugin | Frontend-Client | Router | Service/Repo | DB | Label |
|---|---|---|---|---|---|
| data-products | `api.ts` (catalog + eigen) | `/health`, `/ci-status`, `/certification` GOOD; `/releases*`, `/consume/*` **UNUSED** | certification/release-Overlays (Dateien) | Catalog-Annotationen | REFACTOR (UNUSED-Routen raus) |
| entitlements | `marketplace/entitlementApi.ts` | Kern GOOD; `/capabilities`, `/entitlements/:productId`, `/registrations/:id` **UNUSED**; `/metering` 501-Noop | `runtime.ts` + 2 parallele In-Memory-Stores | keine | REFACTOR |
| nexora | `nexora-common/api.ts` | alle GOOD (Mock-Fixtures) | `fixtures.ts` | keine | GOOD (Mock-Domäne) |
| model-company | `api.ts` | ~30 Routen GOOD; `/simulation/tick` test-only | `FileSimulationStore` | JSON-Dateien | GOOD (Demo) |
| plugin-directory | `api.ts` | GOOD | `inventory.ts` (FS-Scan) | keine | GOOD |
| urs-composer | `ursComposerApi.ts` | alle GOOD | Service + **2 Repos** (memory + postgres, `mode`) | **PostgreSQL** (9 Tabellen) | KEEP; Legacy-Pfade (P0 `requirements`) tot |
| validation-expert | `api.ts` | alle GOOD | Service + `FileValidationRunRepository`; URS via HTTP | JSON-Datei | GOOD |
| validation-manager | keiner (kein Mount) | **alle Stubs**, Imports gebrochen | fehlt | keine | **REMOVE** |
| authorization-registry | **keiner** | alle UNUSED (außer /health) | In-Memory-Map (YAML-Scan) | keine | **REMOVE** |
| aas (`packages/backend/src/aas`) | `modules/assets/aasClient.ts` | GOOD | `MemoryAasRepository` | In-Memory | **WRONG LAYER → plugins/aas-backend** |

Cross-Plugin-Privat-DB-Zugriff: **keiner** (validiert). Einzige Cross-Plugin-Kommunikation: validation-expert → urs-composer über HTTP (korrekt).

### 4.2 Layer-Verletzungen & Duplikate

- **WRONG LAYER:** `packages/backend/src/aas/*` (komplettes Plugin im Core) → verschieben.
- **GOOD (Backstage-Muster):** `permission/policy.ts` muss im Backend-App leben (Policy-Extension-Point) — bleibt; aber `EntitlementRuntime`-Aufbau (`permission/module.ts:20-27`) gehört in den entitlements-Backend-Service (REFACTOR).
- **Klein:** `dataProductCompatibilityMatrix.ts` (Backend-Core) → `platform-common` oder data-products-plugin.
- **DUPLICATE:** `authorize()`+`respondError()`-Helper in 7 Routern kopiert (urs-composer/router.ts:49 dokumentiert die Kopie selbst) → ein Helper in `platform-common` (Wave 3).
- **DUPLICATE:** 2 Entitlement-Stores (links/registrations) → dokumentieren, in Wave 3 zu einem Store konsolidieren (ohne DB-Änderung).
- **LEGACY:** urs-composer P0-`requirements`-Tabelle + Memory-Repository-Pfade (Produktion nutzt postgres) → nach P1A-Verifikation entfernen (Wave 4).
- **BUG-KANDIDAT:** `createBaseline`-Signatur-Mismatch router.ts:536 vs. service.ts:705 → in Wave 3 verifizieren (Test) und fixen.

### 4.3 Ergebnis

Ziel-Backend: 8 saubere interne Plugin-Backends statt 10 Registrierungen (inkl. aas) — keine Stub-Router, keine UNUSED-Routen, keine kopierten Helper.

---

## 5. DEAD CODE ANALYSIS

**SAFE TO REMOVE** (0 Runtime-/Routing-/Config-/Permission-/Test-/dynamische Referenzen, verifiziert per Repo-weitem Grep; Ausführung erst Wave 4):

| FILE | SYMBOL | WHY SUSPECTED | REFERENCES | CONFIDENCE | SAFE? |
|---|---|---|---|---|---|
| `packages/app/src/modules/identity/HeroScene.tsx` | `HeroScene` (Re-Export-Alias) | Landing nutzt `HeroArchitecture` direkt | 0 | hoch | **JA** |
| `packages/app/src/modules/identity/FitsTogetherSection.tsx` (+ Test) | `FitsTogetherSection` | Alte Landing-Sektion, nicht in `PublicLanding.tsx` | nur eigener Test | hoch | **JA** |
| `packages/app/src/modules/identity/LearnSection.tsx` (+ Test) | `LearnSection` | Dito (Konstanten `LEARN_*` bleiben via `landingI18n` genutzt) | nur eigener Test | hoch | **JA** |
| `plugins/data-products/src/components/GovernanceCard.tsx` | `GovernanceCard` | nicht exportiert/importiert | 0 | hoch | **JA** |
| `plugins/validation-manager/backend/**` (verschachtelter Baum) | komplett | Nicht im Workspace-Build-Graph, nicht registriert; `requirementService`/`auditService` nur hier | nur gebrochene Imports des Stub-Routers | hoch | **JA** (nur zusammen mit validation-manager-backend, Wave 4) |
| `plugins/validation-manager` (Frontend) | komplett | kein `plugin.tsx`, keine Routen, nicht in App.tsx | 0 | hoch | **JA** (Wave 4) |
| `plugins/validation-manager-backend` (Backend) | komplett | alle Routen TODO-Stubs; Services fehlen; 0 Caller | 0 (Frontend nicht gemountet) | hoch | **JA** (Wave 4, nach Deregistrierung Wave 3) |
| `plugins/authorization-registry-backend` | komplett | 0 Konsumenten, Drift zu `permissions.ts` | 0 | hoch | **JA** (Wave 4, nach RBAC-Konsolidierung) |
| `plugins/marketplace/src/index.ts` | Re-Export `CompositionTreeVisual` | Komponente lebt über `OeeBuiltWith` | 0 externe | hoch | Re-Export-Zeile: JA; Komponente: NEIN |

**Explizit NICHT tot** (geprüft): `GoldenPathShowcase`, `releaseCatalogRows`, `golden-path-releases.json`-Reader, `HomeDashboard`, `identity/home/*`, alle Architecture-Diagram-Komponenten.

**Backend-UNUSED-Routen** (aus Abschnitt 4.1, Entfernung Wave 3): data-products `/consume/*` + `/releases*`; entitlements `/capabilities`, `/entitlements/:productId`, `/registrations/:id`, `/metering`(501).

---

## 6. DATA CLEANUP (NUR PLAN — KEINE LÖSCHUNG)

| Bereich | Befund | Cleanup-Plan (später) |
|---|---|---|
| DB-Tabellen | Einzige echte DB: urs-composer (9 Tabellen). `requirements` = P0-Legacy, `audit_events` generisch. | Nach P1A-Abschluss: Migration zum Droppen von `requirements` + Daten-Migration dokumentieren. **Kein** direkter SQL-Zugriff. |
| Duplikate Modelle | `validation-manager/backend/src/db/schema.sql` definiert 10 GxP-Tabellen + Views + Trigger — **wurde nie ausgeführt** (Plugin tot). | Mit Plugin-Entfernung (Wave 4) verschwindet das Schema ohne DB-Risiko. |
| Rollen-Daten | 3 parallele Rollenmodelle: `PlatformRole`, Backstage-Permissions, `validation-manager-backend/src/models/admin.ts` (`SystemRole` QA_LEAD/…) | Letzteres entfällt mit Plugin; Doku auf Zielmodell (Abschnitt 3) konsolidieren. |
| Seeds | `urs-composer-backend/src/db/seeds.ts` (idempotent, KEEP); `validation-manager/backend/src/db/init.ts` (entfällt mit Plugin) | KEEP / entfällt. |
| Fixtures/Testdaten in src | `data-products/consume/fixtures.ts`, `nexora-backend/fixtures.ts`, `model-company __fixtures__`, `compatibility-policy.json`×2, `platform-versions.json` | Fixtures KEEP (Mock-Domänen); JSON-Policy-Dateien als Runtime-Config dokumentieren, Dubletten (sdk vs. plugin) prüfen. |
| Committete Runtime-Dateien | `packages/backend/.runtime/model-company/state.json`, `packages/backend/validation/runtime/runs-store.json` | In `.gitignore` aufnehmen; Dateien aus Tracking entfernen (kein Löschen lokaler Daten). |
| Config-Keys | READ-never-DEFINED: `dataProducts.releases.overlayPath`, `modelCompany.integrations.{equipment,temperature}HealthUrl`, `ursComposer.persistence.mode` (prod) | Entweder in `app-config.yaml` dokumentieren/ergänzen oder Fallbacks entfernen (Wave 4, nur Config-Text). |
| Config-Keys | DEFINED-never-READ: `modelCompany.mqtt.brokerUrl`, `modelCompany.mqtt.port`; `rbac`-Block (Backend deaktiviert) | Entfernen bzw. mit `/rbac`-Entscheidung (Abschnitt 3) bereinigen. |
| Duplikate Permission-Daten | `templates/*/authorization.yaml` (6 Dateien) driftet von `permissions.ts` | Mit authorization-registry entfernen ODER als Doku-Generator neu aufsetzen (Entscheidung Wave 4). |
| Plugin-Metadaten | `golden-path-releases.json` (platform-common) spiegelt `catalog/releases/golden-path-releases.yaml` | Ein Quellformat festlegen; Mirror-Test ergänzen (Wave 4). |

---

## 7. REPOSITORY CLEANUP (64 Root-Markdown-Dateien)

Klassen: **KEEP IN ROOT · MOVE TO DOCS · ARCHIVE (`docs/archive/`) · OBSOLETE** (Löschung nur nach Sichtprüfung durch User; Git-History bleibt Referenz).

**KEEP IN ROOT (3):** `AGENTS.md`, `README.md`, `ROADMAP.md`

**MOVE TO DOCS** (Architektur/Governance/Design, 12):
`ARCHITECTURE_BASELINE_V1_REPORT.md` · `ARCHITECTURE_BOUNDARY_GATE_1_0_REPORT.md` · `BACKEND_AUTHORIZATION_ARCHITECTURE.md` · `BACKEND_AUTHORIZATION_BACKSTAGE_STANDARD.md` · `P0_BACKEND_ROUTE_AUDIT_MATRIX.md` · `P1A_POSTGRES_PERSISTENCE_STRATEGY.md` · `PERSONA_ACCEPTANCE_TEST.md` · `REGRESSION_TEST.md` · `URS-COMPOSER-P1A-ARCHITECTURE.md` · `URS-COMPOSER-REFINED-ARCHITECTURE.md` · `plugin-directory-design.md` · `validation-expert-design.md` → `docs/architecture/` bzw. `docs/testing/`

**ARCHIVE** (historische Gate-/Phasen-Evidenz, 36):
`AUTHORIZATION_PROFILE_REGISTRY_IMPLEMENTATION_REPORT.md` · `AUTHORIZATION_PROFILE_REGISTRY_VERIFICATION_REPORT.md` · `BACKSTAGE_ACCESS_AUDIT_1_0.md` · `BACKSTAGE_RBAC_INTEGRATION_ANALYSIS.md` · `BACKSTAGE_RBAC_MIGRATION_REPORT.md` · `BACKSTAGE_RUNTIME_RECOVERY_REPORT.md` · `GOLDEN_PATH_AUTHORIZATION_PLATFORM_MIGRATION_REPORT.md` · `GOLDEN_PATH_AUTHORIZATION_WORKFLOW_REPORT.md` · `IMPLEMENTATION_ROADMAP_HARDENING_ADMIN_1_0.md` · `MIGRATION_COMPLETE_SUMMARY.md` · `P0_COMPLETION_REPORT.md` · `P0_EXECUTION_PLAN.md` · `P0_P1_P2_IMPLEMENTATION_SUMMARY.md` · `P1A_IMPLEMENTATION_READY.md` · `P1A_PERSISTENCE_COMPLETION_SUMMARY.md` · `P1A_POSTGRES_FINAL_REPORT.md` · `P1A_POSTGRES_PERSISTENCE_REPORT.md` · `P1B_API_INSPECTION_REPORT.md` · `P1B_FINAL_GATE_SUMMARY.md` · `PHASE-1-BACKEND-SUMMARY.md` · `PLATFORM_RBAC_FINAL_VERIFICATION_REPORT.md` · `PLATFORM_RBAC_IMPLEMENTATION_VERIFICATION_REPORT.md` · `PLATFORM_RBAC_SHARED_CAPABILITY_REPORT.md` · `PORTAL_EXPERIENCE_SIMPLIFICATION_REPORT.md` · `PORTAL_ROUTING_RECOVERY_REPORT.md` · `PORTAL_RUNTIME_UI_VERIFICATION_REPORT.md` · `RBAC_IMPLEMENTATION_ROADMAP.md` · `URS-COMPOSER-IMPLEMENTATION-PLAN.md` · `URS-COMPOSER-P1A-FOUNDATION-REPORT.md` · `URS_COMPOSER_P0_FINAL_REPORT.md` · `URS_COMPOSER_P1A_PERSISTENCE_VERIFICATION_REPORT.md` · `URS_COMPOSER_P1B_API_VERIFICATION_REPORT.md` · `URS_COMPOSER_P1C_COMPLETION_REPORT.md` · `URS_COMPOSER_P1C_PHASE2_VERIFICATION_REPORT.md` · `URS_VALIDATION_EXPERT_INTEGRATION_REPORT.md` · `VALIDATION-MANAGER-SUMMARY.md`

**OBSOLETE** (Snapshots/Duplikate — Löschung nach Sichtprüfung, 13):
`APPROVAL-WORKFLOW-FILES.md` · `CURRENT_PRODUCT_STATUS_AUTHORIZATION_URS.md` · `P1A_PERSISTENCE_COMPLETION_INDEX.md` · `P1A_PERSISTENCE_VERIFICATION_STATUS.md` · `P1B_API_IMPLEMENTATION_STATUS.md` · `P1C_PHASE2_FINAL_STATUS.md` · `PLATFORM_RBAC_SHARED_CAPABILITY_GATE_PASSED.md` (Dup von REPORT) · `URS_COMPOSER_CURRENT_STATUS_AUDIT.md` · `URS_COMPOSER_P1A_PERSISTENCE_VERIFICATION_CHECKLIST.md` (ersetzt durch REPORT) · `URS_COMPOSER_P1A_POSTGRESQL_IMPLEMENTATION_STATUS.md` · `URS_COMPOSER_P1B_API_GATE_PASSED.md` · `URS_COMPOSER_P1B_API_VERIFICATION_FINAL.md` · `URS_COMPOSER_P1C_IMPLEMENTATION_STATUS.md`

`AGENTS.md` und alle Governance-/Architektur-Dokumente bleiben vollständig erhalten (MOVE ≠ Löschen).

---

## 8. IMPLEMENTATION WAVES (max. 5)

### Wave 0 — SAFETY BASELINE
- **OBJECTIVE:** Belastbare Basis: Inventar aller uncommitteten Änderungen erstellen, `tsc`/`lint`/Build grün, kaputten Unit-Test-Runner reparieren (`runtime.enterTestCode is not a function` — jest-circus/`@jest/environment`-Mismatch), User-Entscheidung über Baseline-Commits einholen.
- **FILES/PLUGINS:** keine Produktivcode-Änderung; ggf. jest-devDependency-Angleichung (genehmigungspflichtig), Root-Scripts, CI-Early-Step `yarn guard:platform` (falls sicher).
- **DEPENDENCIES:** keine.
- **RISKS:** niedrig; einziges Risiko = Jest-Fix berührt devDeps → explizite Freigabe nötig.
- **TESTS:** alle Unit-Suiten lauffähig; `tsc`; `lint`; Browser-Smoke Home/Admin.
- **ROLLBACK:** trivial (keine Produktivänderung).
- **USER IMPACT:** keiner (intern).

### Wave 1 — NAVIGATION & UX SIMPLIFICATION
- **OBJECTIVE:** 6-Tier-Zielnavigation umsetzen: Discover-Tier, Operate-Hub (neu), Model-Company-Demotion (Demo), Plugin Directory nur Admin, `/assets`+`/developer` ins Build-Submenu, Orphan-Routen anbinden.
- **FILES/PLUGINS:** `Sidebar.tsx`, neues `modules/operate/*`, `BuildLandingPage`, `MyProductsLandingPage`, `AdminLandingPage`, `App.tsx` (nur Registrierung des Operate-Moduls).
- **DEPENDENCIES:** Wave 0 (Tests müssen existieren).
- **RISKS:** niedrig — nur Komposition; keine Routen-Löschung; keine Backstage-Kern-Änderung.
- **TESTS:** Sidebar-/Route-Tests, Browser-Verifikation aller Zielrouten (Pattern des Portal-Gates wiederverwenden).
- **ROLLBACK:** `git revert` der Wave; Routen blieben durchgehend bestehen.
- **USER IMPACT:** sichtbar: 6 klare Bereiche, Demo klar markiert, technische Flächen verschwinden aus der Dev-Navigation.

### Wave 2 — RBAC / PERMISSION CONSOLIDATION
- **OBJECTIVE:** Zielrollenmodell (Abschnitt 3.3) mit neuer VALIDATOR-Rolle; eine Permission-Quelle; obsolete hard-denied Permissions entfernen (nach Grep-Nachweis); Backend-Hybrid-Check entfernen; `/rbac`-Mount + Nav-Link entfernen; Policy-Prädikate aus Sets ableiten.
- **FILES/PLUGINS:** `platform-common` (roles/permissions/policy), `packages/backend/src/permission/*`, `entitlements-backend/router.ts`, `App.tsx`, `Sidebar.tsx`, `examples/org.yaml`, RBAC-Tests + Docs.
- **DEPENDENCIES:** Wave 0 (Tests!), Wave 1 (Nav-Link-Entfernung).
- **RISKS:** **mittel** (Autorisierung). Milderung: streng additiv beginnen (neue Rolle zuerst), jede Enge-Änderung einzeln testen; **kein Permission entfernen ohne vollständigen Verwendungsnachweis**.
- **TESTS:** Policy-/Rollen-Unit-Tests, Rollen-Set-Diff-Test, Browser-Test Developer vs. Validator vs. Admin.
- **ROLLBACK:** additive Phase einzeln revertierbar; Import-Umstellung atomar pro Datei.
- **USER IMPACT:** Validatoren bekommen erstmals eine eigene Rolle; POs verlieren Validierungs-Review (gewollt); kein Feature-Verlust.

### Wave 3 — BACKEND & PLUGIN CONSOLIDATION
- **OBJECTIVE:** `aas` → `plugins/aas-backend`; validation-manager-backend deregistrieren; UNUSED-Routen entfernen (data-products `/consume/*`+`/releases*`, entitlements `/capabilities` u. a.); App-`assets`-Modul → `nexora-assets`; `authorize`/`respondError`-Helper zentralisieren; `createBaseline`-Mismatch verifizieren/fixen; 2 Entitlement-Stores konsolidieren.
- **FILES/PLUGINS:** `packages/backend/src/*`, `plugins/{data-products,entitlements,nexora-assets}-*`, neu `plugins/aas-backend`, `platform-common`.
- **DEPENDENCIES:** Waves 0–1 (Tests + Nav stabil).
- **RISKS:** mittel-niedrig. Milderung: Routen-Entfernung nur bei 0-Caller-Evidenz; aas-Verschiebung ändert die API nicht (pluginId bleibt `aas`).
- **TESTS:** API-Smoke je Plugin, Router-Tests, Browser-Flows (Assets, Data Products, Entitlements, Validate).
- **ROLLBACK:** pro Plugin einzeln revertierbar; aas atomar verschieben.
- **USER IMPACT:** keiner (intern).

### Wave 4 — DEAD CODE / DATA / REPOSITORY CLEANUP
- **OBJECTIVE:** SAFE-TO-REMOVE-Dateien (Abschnitt 5) löschen; validation-manager (Frontend+Backend+nested tree) und authorization-registry-backend entfernen; Config-Key-Reconciliation (Abschnitt 6); `.runtime`-Commits gitignoren; 64 Root-MDs gemäß Abschnitt 7 verschieben/archivieren (OBSOLETE nur nach User-Sichtprüfung); P0-Legacy-Tabellen-Migration **planen** (nicht ausführen).
- **FILES/PLUGINS:** s. Abschnitte 5–7.
- **DEPENDENCIES:** Waves 0–3 (erst konsolidieren, dann löschen).
- **RISKS:** mittel — Löschungen. Milderung: alles über Git-History reversibel; jede Löschung mit Grep-Nachweis dokumentiert; keine DB-Löschung.
- **TESTS:** `tsc`, Build, volle Test-Suite, Browser-Smoke aller 6 Tiers.
- **ROLLBACK:** `git restore`/revert je Kandidat; Dateiverschiebungen sind reine Moves.
- **USER IMPACT:** keiner.

**Reihenfolge-Begründung:** Tests zuerst (W0), weil Waves 2–3 Autorisierung/Backend anfassen; UI zuerst (W1), weil sie nutzbar und risikoarm ist; RBAC vor Backend-Löschungen (W2 vor W3/4), weil authorization-registry & validation-manager erst nach Konsolidierung gefahrlos entfernt werden können.

---

## 9. EMPFEHLUNG & STOP

**Empfohlene erste Wave: Wave 0 — SAFETY BASELINE.**

Begründung (höchster Nutzen bei niedrigstem Risiko):
1. Das Repo trägt ~30 uncommittete Dateien aus mehreren Gates (Portal-Experience, Guardrails, RBAC-Migration) — jede weitere Änderung baut auf unsicherem Grund.
2. Der Unit-Test-Runner ist kaputt (jest-Mismatch). Waves 2–3 ändern Autorisierung und Backend — ohne lauffähige Tests ist das nicht vertretbar.
3. Wave 0 ändert **keinen** Produktivcode, keine Abhängigkeiten im Laufzeit-Sinne und ist vollständig revertierbar; der einzige heikle Punkt (Jest-devDep-Angleichung) ist klar abgegrenzt und genehmigungspflichtig.
4. Erst mit grüner Baseline können Wave 1+ den Nutzen sicher liefern (Browser-Verifikation + Tests pro Wave).

Danach: Wave 1 (Navigation & UX) als erste für End-User sichtbare Verbesserung.

**STOP — warte auf deine Freigabe. Es wurde kein Code geändert, nichts committet, nichts gelöscht.**
