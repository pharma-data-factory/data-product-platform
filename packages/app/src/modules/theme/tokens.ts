import {
  NEXORA_BORDER,
  NEXORA_CARD,
  NEXORA_COMPLIANCE,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_CYAN_LIGHT,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_SECTION,
  NEXORA_SECURITY,
  NEXORA_SURFACE,
  NEXORA_TEXT,
  nexoraColors,
} from '@internal/plugin-nexora-common';

export const BRAND_NAME = 'Nexora';
export const BRAND_WORDMARK = 'NEXORA';
export const PLATFORM_POSITIONING = 'THE OPEN MANUFACTURING PLATFORM FOR LIFE SCIENCES';

const light = nexoraColors.light;

export const C = {
  base: light.surface,
  section: light.section,
  paper: light.surfaceRaised,
  card: light.surfaceRaised,
  border: light.border,
  text: light.text,
  muted: light.textMuted,
  cloud: NEXORA_NAVY,
  factory: NEXORA_CYAN,
  dx: NEXORA_CYAN,
  compliance: NEXORA_COMPLIANCE,
  security: NEXORA_SECURITY,
  observability: NEXORA_NAVY,
} as const;

export const PHARMA_NAVY = NEXORA_NAVY;
export const PHARMA_NAVY_DARK = NEXORA_NAVY_DARK;
export const PHARMA_TEAL = NEXORA_CYAN;
export const PHARMA_TEAL_LIGHT = NEXORA_CYAN_LIGHT;
export const PHARMA_TEAL_DARK = NEXORA_CYAN_DARK;
export const PHARMA_SURFACE = NEXORA_SURFACE;
export const PHARMA_PAPER = NEXORA_CARD;
export const PHARMA_TEXT = NEXORA_TEXT;
/** Readable cyan for small text on light surfaces. */
export const PHARMA_TEAL_ON_LIGHT = light.accentReadable;
