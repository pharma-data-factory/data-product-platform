/**
 * The single source of colour for Nexora — Control Plane and public surfaces.
 *
 * packages/app/src/modules/theme/tokens.ts re-exports these as PHARMA_* plus
 * the semantic map C, and identity/landingTokens.ts re-exports again for the
 * landing page. Everything therefore resolves back to this file: changing a
 * value here must reach every surface. Raw hex literals in components break
 * that guarantee and also break the light/dark switch under User Settings,
 * because a hardcoded colour cannot follow the theme.
 *
 * Two rules when picking a token:
 *   1. Brand colours (cyan, security orange) are for FILLS with dark text,
 *      accents and illustrations. They are not readable as text on white and
 *      not readable under white text — use the *_FG variants for that.
 *   2. Every foreground/background pair below is verified at >= 4.5:1
 *      (WCAG 2.1 AA, normal text) by tokens.contrast.test.ts.
 */

// --- Brand -----------------------------------------------------------------
export const NEXORA_NAVY = '#0A1929';
export const NEXORA_NAVY_DARK = '#05101C';
export const NEXORA_CYAN = '#00C2D9';
export const NEXORA_CYAN_LIGHT = '#5EE4F0';
export const NEXORA_CYAN_DARK = '#0098AB';
/**
 * Readable counterpart of NEXORA_CYAN, for text and for fills under white
 * text. NEXORA_CYAN_DARK is NOT sufficient — it only reaches 3.45:1.
 */
export const NEXORA_CYAN_FG = '#00788A';
export const NEXORA_COMPLIANCE = '#0891B2';
export const NEXORA_SECURITY = '#FF8A00';
/** Readable counterpart of NEXORA_SECURITY. */
export const NEXORA_SECURITY_FG = '#B45309';

// --- Neutrals --------------------------------------------------------------
// The values the codebase already used as ad-hoc literals, promoted to tokens.
export const NEXORA_TEXT = '#0F172A';
export const NEXORA_MUTED = '#475569';
export const NEXORA_BORDER = '#E8EEF2';
export const NEXORA_CARD = '#FFFFFF';
export const NEXORA_SURFACE = '#F4F6F8';
export const NEXORA_SECTION = '#EEF2F6';

export const NEXORA_GREY = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  900: '#0F172A',
} as const;

// --- Semantic tones --------------------------------------------------------
/**
 * Each tone carries a fill (`bg`) with its readable `fg`, plus a `text`
 * variant for colouring type directly on a light surface. Keeping those apart
 * is the fix for the contrast defects: the old palette reused one value for
 * both, which cannot satisfy both directions.
 */
export const NEXORA_TONE = {
  /** In progress, awaiting action. Brand cyan, darkened to stay readable. */
  active: { bg: NEXORA_CYAN_FG, fg: NEXORA_CARD, text: NEXORA_CYAN_FG },
  success: { bg: '#0F766E', fg: NEXORA_CARD, text: '#0F766E' },
  warning: { bg: 'rgba(255, 138, 0, 0.14)', fg: '#9A3412', text: '#9A3412' },
  danger: { bg: '#B91C1C', fg: NEXORA_CARD, text: '#B91C1C' },
  info: { bg: 'rgba(10, 25, 41, 0.08)', fg: NEXORA_NAVY, text: NEXORA_NAVY },
  neutral: { bg: NEXORA_GREY[200], fg: NEXORA_GREY[700], text: NEXORA_GREY[600] },
} as const;

export type NexoraToneName = keyof typeof NEXORA_TONE;

/**
 * Legacy shape kept so existing imports keep working. Prefer NEXORA_TONE.
 * Previously declared in components/StatusBadge.tsx; palette belongs here.
 */
export const NEXORA_STATUS = {
  passBg: NEXORA_TONE.success.bg,
  passFg: NEXORA_TONE.success.fg,
  failBg: NEXORA_TONE.danger.bg,
  failFg: NEXORA_TONE.danger.fg,
  warnBg: NEXORA_TONE.warning.bg,
  warnFg: NEXORA_TONE.warning.fg,
  infoBg: NEXORA_TONE.info.bg,
  infoFg: NEXORA_TONE.info.fg,
  neutralBg: NEXORA_TONE.neutral.bg,
  neutralFg: NEXORA_TONE.neutral.fg,
} as const;
