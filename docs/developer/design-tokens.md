# Design tokens (colors & typography)

Owner: Platform Team  
Audience: INTERNAL ENGINEERING  
Last reviewed: 2026-09-09

## Single source of truth

Change **colors and fonts only** in
[`plugins/nexora-common/src/design/`](../../plugins/nexora-common/src/design/).

Package export: `@internal/plugin-nexora-common`

| Module | Role |
| --- | --- |
| `design/tokens.ts` | Brand primitives + light/dark semantic maps + typography |
| `design/cssVariables.ts` | `--nexora-*` (and legacy `--nx-*` bridge) |
| `design/NexoraGlobalStyles.tsx` | Injects `:root` vars for the active Control Plane theme |

Do **not** add a second token file in `platform-common` (domain ≠ design).
Do **not** hard-code new brand hex values in `packages/app` or plugins.

## Light / dark switch

Control Plane themes (`nexora-light` / `nexora-dark`) mount `NexoraGlobalStyles`
inside each `UnifiedThemeProvider`. Flipping the top-right theme switch updates
MUI palette **and** CSS variables together.

Public marketing pages (Landing, Solutions, Architecture) pin the **light**
palette on `.pdf-root` so dark mode never washes out section text or cards.

## How to consume

- **MUI / Control Plane:** use theme palette (already wired from `nexoraColors`).
- **Custom CSS / Landing:** `var(--nexora-color-text)`, `var(--nexora-font-display)`, …
- **Status chips / approvals / CI:** `NEXORA_STATUS` / `nexoraStatus` (pass, fail, warn, active, …).
- **Small text on light surfaces:** use `accentReadable` /
  `PHARMA_TEAL_ON_LIGHT` (`#0098AB`), not raw brand cyan (`#00C2D9`).
- **Plugin chrome:** prefer `NexoraToolPage` + tokens from `@internal/plugin-nexora-common`.
- **Legacy aliases:** `PHARMA_*` / `C` in `packages/app` remain re-exports.

Do not invent a second local `NX = { navy: '#0A1929', … }` map in a plugin.
Import from `@internal/plugin-nexora-common` instead.

## Change checklist

1. Edit `nexoraPrimitives` / `nexoraColors` / `nexoraTypography` in `design/tokens.ts`.
2. Reload the app — Control Plane and Landing should pick up the change.
3. Avoid duplicating hex values in component `style={{}}` blocks.
