# Nexora — Persona Acceptance Test Suite
**Date**: 2026-08-24  
**Phase**: P0/P1/P2 Validation Architecture Story Alignment

---

## Overview
Three personas, one canonical architecture story presented with different zoom levels.

---

## PERSONA 1: Customer / Business Perspective
**Page**: `/platform/architecture`

### ✅ Test Cases

| Test ID | Requirement | Check | Status |
|---------|-------------|-------|--------|
| **C-1** | Hero eyebrow says "Customer / Business Perspective" | Visual inspection: Eyebrow text | □ PASS |
| **C-2** | Hero title: "Keep Core Systems Standard. Innovate Through Data Products." | Visual inspection: Hero title | □ PASS |
| **C-3** | Overview image present and loads | Visual inspection: Figure with ArchitectureOverviewImage | □ PASS |
| **C-4** | ViewSelectorSection visible after hero | Visual inspection: "YOU ARE VIEWING: CUSTOMER VIEW" card | □ PASS |
| **C-5** | ViewSelector shows links to Developer and Admin views | Click test: "→ Developer technical view" and "→ Admin governance map" | □ PASS |
| **C-6** | ValidationByDesignSection positioned BEFORE technical diagrams | Visual inspection: Order in page flow | □ PASS |
| **C-7** | ValidationByDesign title: "Built for Controlled Change." | Visual inspection: Section h2 | □ PASS |
| **C-8** | ValidationByDesign shows 6 evidence categories | Count: Requirements, Architecture, Tests, CI Evidence, Contracts, Traceability | □ PASS |
| **C-9** | ValidationByDesign includes customer benefits (No reconstruction, Complete record, Faster validation, Focused effort) | Visual inspection: Bulleted list | □ PASS |
| **C-10** | Disclaimer visible: "Technical certification ≠ GxP validation" | Visual inspection: Important note section | □ PASS |
| **C-11** | ResponsibilityModelSection shows partnership framing | Visual inspection: "Platform innovation + Domain focus partnership" | □ PASS |
| **C-12** | ResponsibilityModel left column: "PLATFORM STANDARDIZES" | Visual inspection: Column title and description | □ PASS |
| **C-13** | ResponsibilityModel right column: "YOU FOCUS ON" | Visual inspection: Column title and description | □ PASS |
| **C-14** | Responsibility section intro box has teal gradient background | Visual inspection: Background color | □ PASS |
| **C-15** | All "Nexora" references replaced with "Nexora" | Text search: No "Nexora" on page | □ PASS |
| **C-16** | Technical diagrams present (full-stack, AAS, contracts) | Visual inspection: DiagramSection components | □ PASS |
| **C-17** | CTA present and functional | Visual inspection: ArchitectureCta component | □ PASS |
| **C-18** | Page renders without JavaScript errors | Console check: No red errors | □ PASS |

### 🎯 Acceptance Criteria
- **PASS**: All 18 checks pass ✓
- **PASS WITH NOTES**: 17/18 pass, notes documented ⚠️
- **FAIL**: 16 or fewer pass ✗

**Result**: ___________

**Notes**:
```
[Add any observations or issues]
```

---

## PERSONA 2: Developer / Technical Perspective
**Page**: `/platform/architecture/developer`

### ✅ Test Cases

| Test ID | Requirement | Check | Status |
|---------|-------------|-------|--------|
| **D-1** | Hero eyebrow says "Developer / Technical Perspective" | Visual inspection: Eyebrow text | □ PASS |
| **D-2** | Hero title present and on-brand | Visual inspection: Hero section | □ PASS |
| **D-3** | BackstageFoundationSection visible and explains Backstage role | Visual inspection: Section content | □ PASS |
| **D-4** | BackstageFoundation mentions: Catalog, Scaffolder, TechDocs, Search, API, SDK | Count keywords in text | □ PASS |
| **D-5** | Developer flow diagram present and loads | Visual inspection: DeveloperArchitectureDiagram component | □ PASS |
| **D-6** | Technical stack layers explained | Visual inspection: Diagram sections (Backstage, Platform, Products) | □ PASS |
| **D-7** | "Nexora" naming used consistently | Text search: No "Nexora" on page | □ PASS |
| **D-8** | All Nexora → Nexora replacements complete | Text search: All references updated | □ PASS |
| **D-9** | Developer journey steps explained (Build, Compose, Test, Release, Operate) | Visual inspection: Step narratives | □ PASS |
| **D-10** | Links to technical documentation present | Link check: Documentation hrefs functional | □ PASS |
| **D-11** | Golden Paths explained with technical context | Visual inspection: Content clarity | □ PASS |
| **D-12** | Responsibility model aligned with developer view (What platform provides vs. what you implement) | Visual inspection: Messaging consistency | □ PASS |
| **D-13** | Page renders without JavaScript errors | Console check: No red errors | □ PASS |

### 🎯 Acceptance Criteria
- **PASS**: All 13 checks pass ✓
- **PASS WITH NOTES**: 12/13 pass, notes documented ⚠️
- **FAIL**: 11 or fewer pass ✗

**Result**: ___________

**Notes**:
```
[Add any observations or issues]
```

---

## PERSONA 3: Admin / Governance Perspective
**Page**: `/admin/platform-architecture` (sign-in required)

### ✅ Test Cases

| Test ID | Requirement | Check | Status |
|---------|-------------|-------|--------|
| **A-1** | Page title: "Platform Architecture & Governance" | Visual inspection: Page header | □ PASS |
| **A-2** | Intro paragraph explains platform layering | Visual inspection: Intro section text | □ PASS |
| **A-3** | Architecture Layers section shows 3 layers (Backstage, Platform, Governance) | Count: 3 distinct layer boxes | □ PASS |
| **A-4** | Key Workspaces section lists 6 items (Component Library, Catalog, Marketplace, Create, Data Products, Validation Expert) | Count: 6 workspace cards | □ PASS |
| **A-5** | Workspace cards are clickable and link to correct pages | Link test: 6 navigation links functional | □ PASS |
| **A-6** | Key Concepts section explains 6 concepts (Components, Golden Paths, Data Products, Composition, Technical Certification, Validation) | Count: 6 concept boxes | □ PASS |
| **A-7** | Responsibility Model section shows "PLATFORM STANDARDIZES" vs "PRODUCT TEAM OWNS" | Visual inspection: Two-column layout | □ PASS |
| **A-8** | Admin Dashboard section visible with 3 cards (Lifecycle, Status, Evidence) | Count: 3 dashboard cards | □ PASS |
| **A-9** | Admin Dashboard cards have direct links to monitoring areas | Link test: 3 dashboard links functional | □ PASS |
| **A-10** | Status Model section explains 4 dimensions (Implementation, Release, Commercial, Validation) | Count: 4 status dimension boxes | □ PASS |
| **A-11** | Status Model includes disclaimer about NOT collapsing dimensions | Visual inspection: "must never be collapsed" text | □ PASS |
| **A-12** | "Learn More" section has links to architecture, developer, and developer hub pages | Link test: 3 navigation links present | □ PASS |
| **A-13** | Page renders without JavaScript errors | Console check: No red errors | □ PASS |

### 🎯 Acceptance Criteria
- **PASS**: All 13 checks pass ✓
- **PASS WITH NOTES**: 12/13 pass, notes documented ⚠️
- **FAIL**: 11 or fewer pass ✗

**Result**: ___________

**Notes**:
```
[Add any observations or issues]
```

---

## PERSONA 4: Developer Hub / Internal Engineering Perspective
**Page**: `/developer` (authenticated, for internal engineers)

### ✅ Test Cases

| Test ID | Requirement | Check | Status |
|---------|-------------|-------|--------|
| **E-1** | Hero title: "Developer Hub" | Visual inspection: Hero h1 | □ PASS |
| **E-2** | Hero copy mentions "Nexora" instead of "Nexora" | Text search: "Nexora" present, "Nexora" absent | □ PASS |
| **E-3** | NEW: Architecture Context Card visible after Hero | Visual inspection: "Platform Architecture at a Glance" section | □ PASS |
| **E-4** | Architecture Context Card shows 3 layers in grid | Count: 3 layer boxes (Backstage, Nexora, Data Products) | □ PASS |
| **E-5** | Layer 1 (Backstage) box shows correct content | Visual inspection: "Open-source Control Plane" text | □ PASS |
| **E-6** | Layer 2 (Nexora) box highlighted with teal border | Visual inspection: Teal border and background color | □ PASS |
| **E-7** | Layer 3 (Data Products) box shows correct content | Visual inspection: "Independent services" text | □ PASS |
| **E-8** | Key insight box present: "Systems of record stay authoritative..." | Visual inspection: Callout text | □ PASS |
| **E-9** | Search card present and links to documentation | Visual inspection: Search section and links | □ PASS |
| **E-10** | Architecture card links to `/platform/architecture`, `/platform/architecture/developer`, and marketplace | Link test: 7+ architecture-related links | □ PASS |
| **E-11** | Platform Components section explains composition and reuse | Visual inspection: Section content | □ PASS |
| **E-12** | Two development routes explained (Golden Path vs. Composer) | Visual inspection: Route A and Route B sections | □ PASS |
| **E-13** | Golden Paths section shows certified paths with status badges | Visual inspection: Path cards and badge styling | □ PASS |
| **E-14** | First Day Steps walkthrough present (17 steps) | Count: Step list rendered correctly | □ PASS |
| **E-15** | Page renders without JavaScript errors | Console check: No red errors | □ PASS |

### 🎯 Acceptance Criteria
- **PASS**: All 15 checks pass ✓
- **PASS WITH NOTES**: 14/15 pass, notes documented ⚠️
- **FAIL**: 13 or fewer pass ✗

**Result**: ___________

**Notes**:
```
[Add any observations or issues]
```

---

## Cross-Persona Validation

### Consistency Checks

| Check ID | Requirement | Status |
|----------|-------------|--------|
| **X-1** | "Nexora" naming consistent across all 4 pages | □ PASS |
| **X-2** | Three-layer architecture model consistent across all pages | □ PASS |
| **X-3** | Validation by Design narrative present on Customer & Developer pages | □ PASS |
| **X-4** | ResponsibilityModel framing consistent (partnership tone, not blame) | □ PASS |
| **X-5** | Status model clarity (4 independent dimensions) reinforced on Admin page | □ PASS |
| **X-6** | Navigation between perspectives works smoothly (links in ViewSelector, Hub, etc.) | □ PASS |
| **X-7** | No broken links or navigation errors across pages | □ PASS |
| **X-8** | Visual design consistent (color, typography, spacing) across pages | □ PASS |

### 🎯 Cross-Persona Result
**PASS**: All 8 checks pass ✓  
**PASS WITH NOTES**: 7/8 pass, notes documented ⚠️  
**FAIL**: 6 or fewer pass ✗  

**Result**: ___________

---

## Sign-Off

**Tester Name**: ___________________  
**Date**: ___________________  

**Overall Result**: 
- [ ] ✅ ALL PERSONAS PASS — Ready for Regression Tests
- [ ] ⚠️ PASS WITH NOTES — Minor issues documented, ready to proceed with caution
- [ ] ✗ FAIL — Issues must be fixed before proceeding

**Issues Found** (if any):
```
[List any issues discovered during testing]
```

**Recommendations**:
```
[Any recommendations for improvements or follow-up]
```

---

## How to Run This Test

1. **Visit each page** in the list above
2. **Sign in** for admin/developer pages
3. **Check each test case** against the requirements
4. **Mark PASS or FAIL** for each
5. **Document any issues** in the Notes section
6. **Complete Sign-Off** at the bottom

**Estimated Time**: 20-30 minutes per run

---

## Next Steps (Upon Completion)

- ✅ Regression Tests (existing pages still work)
- ✅ Create PR with all changes
- ✅ Code review
- ✅ Merge to main
- ✅ Deploy to staging

