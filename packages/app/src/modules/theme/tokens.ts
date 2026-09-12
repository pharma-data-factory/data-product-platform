import {
  NEXORA_COMPLIANCE,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_CYAN_LIGHT,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_SECURITY,
  nexoraThemeColor,
} from '@internal/plugin-nexora-common';

export const BRAND_NAME = 'Nexora';
export const BRAND_WORDMARK = 'NEXORA';
export const PLATFORM_POSITIONING = 'THE OPEN MANUFACTURING PLATFORM FOR LIFE SCIENCES';

export const C = {
  base: nexoraThemeColor.surface,
  section: nexoraThemeColor.section,
  paper: nexoraThemeColor.surfaceRaised,
  card: nexoraThemeColor.surfaceRaised,
  cardHover: nexoraThemeColor.cardHover,
  tableHead: nexoraThemeColor.tableHeadBg,
  tint: nexoraThemeColor.cyanTint,
  border: nexoraThemeColor.border,
  borderStrong: nexoraThemeColor.borderStrong,
  text: nexoraThemeColor.text,
  muted: nexoraThemeColor.textMuted,
  accentText: nexoraThemeColor.accentReadable,
  primary: nexoraThemeColor.primary,
  onPrimary: nexoraThemeColor.primaryContrast,
  cloud: nexoraThemeColor.primary,
  factory: NEXORA_CYAN,
  dx: NEXORA_CYAN,
  compliance: NEXORA_COMPLIANCE,
  security: NEXORA_SECURITY,
  observability: nexoraThemeColor.primary,
} as const;

export const PHARMA_NAVY = NEXORA_NAVY;
export const PHARMA_NAVY_DARK = NEXORA_NAVY_DARK;
export const PHARMA_TEAL = NEXORA_CYAN;
export const PHARMA_TEAL_LIGHT = NEXORA_CYAN_LIGHT;
export const PHARMA_TEAL_DARK = NEXORA_CYAN_DARK;
export const PHARMA_SURFACE = nexoraThemeColor.surface;
export const PHARMA_PAPER = nexoraThemeColor.surfaceRaised;
export const PHARMA_TEXT = nexoraThemeColor.text;
/** Readable cyan for small text on the current surface. */
export const PHARMA_TEAL_ON_LIGHT = nexoraThemeColor.accentReadable;
