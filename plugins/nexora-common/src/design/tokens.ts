/**
 * Nexora design tokens — single source of truth for FE colors and typography.
 * Light/dark semantic maps feed CSS variables and MUI themes.
 */

/** Brand primitives (mode-independent). */
export const nexoraPrimitives = {
  navy: '#0A1929',
  navyDark: '#05101C',
  navyMid: '#1E3A5F',
  cyan: '#00C2D9',
  cyanLight: '#5EE4F0',
  /** WCAG-safer cyan for small text on light surfaces (~4.5:1 on white). */
  cyanOnLight: '#0098AB',
  cyanSoft: '#A5F3FC',
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E8EEF2',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#0F172A',
  slate900: '#0B1F3A',
  surface: '#F4F6F8',
  section: '#EEF2F6',
  compliance: '#0891B2',
  security: '#FF8A00',
  darkBg: '#071521',
  darkPaper: '#0B1F3A',
  darkDeep: '#030B14',
  darkHover: '#0F2744',
  darkNavHover: '#163154',
  darkSurface2: '#12243A',
} as const;

export type NexoraColorMode = 'light' | 'dark';

/** Semantic colors that flip with the light/dark theme switch. */
export type NexoraSemanticColors = {
  surface: string;
  surfaceRaised: string;
  section: string;
  text: string;
  textMuted: string;
  textOnDark: string;
  textOnDarkMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  /** Accent for small text / eyebrows on the current surface. */
  accentReadable: string;
  accentOnDark: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryContrast: string;
  navBg: string;
  navHover: string;
  navColor: string;
  navSelected: string;
  submenuBg: string;
  cardHover: string;
  glass: string;
  focus: string;
  link: string;
  linkHover: string;
  compliance: string;
  security: string;
  statusOk: string;
  statusRunning: string;
  statusPending: string;
  heroFrom: string;
  heroTo: string;
  tableHeadBg: string;
  cyanTint: string;
  shadow: string;
};

export const nexoraColors: Record<NexoraColorMode, NexoraSemanticColors> = {
  light: {
    surface: nexoraPrimitives.surface,
    surfaceRaised: nexoraPrimitives.white,
    section: nexoraPrimitives.section,
    text: nexoraPrimitives.slate800,
    textMuted: nexoraPrimitives.slate600,
    textOnDark: nexoraPrimitives.slate50,
    textOnDarkMuted: '#CBD5E1',
    border: nexoraPrimitives.slate200,
    borderStrong: 'rgba(11, 31, 58, 0.16)',
    accent: nexoraPrimitives.cyan,
    accentHover: nexoraPrimitives.cyanOnLight,
    accentReadable: nexoraPrimitives.cyanOnLight,
    accentOnDark: nexoraPrimitives.cyanLight,
    primary: nexoraPrimitives.navy,
    primaryDark: nexoraPrimitives.navyDark,
    primaryLight: nexoraPrimitives.navyMid,
    primaryContrast: nexoraPrimitives.white,
    navBg: nexoraPrimitives.navy,
    navHover: nexoraPrimitives.darkNavHover,
    navColor: '#C5D0DC',
    navSelected: nexoraPrimitives.white,
    submenuBg: nexoraPrimitives.navyDark,
    cardHover: nexoraPrimitives.slate50,
    glass: 'rgba(255, 255, 255, 0.92)',
    focus: nexoraPrimitives.cyan,
    link: nexoraPrimitives.cyan,
    linkHover: nexoraPrimitives.cyanOnLight,
    compliance: nexoraPrimitives.compliance,
    security: nexoraPrimitives.security,
    statusOk: nexoraPrimitives.cyan,
    statusRunning: nexoraPrimitives.navyMid,
    statusPending: nexoraPrimitives.slate500,
    heroFrom: nexoraPrimitives.navyDark,
    heroTo: nexoraPrimitives.navy,
    tableHeadBg: nexoraPrimitives.slate50,
    cyanTint: 'rgba(0, 194, 217, 0.08)',
    shadow: '0 1px 2px rgba(11, 31, 58, 0.06)',
  },
  dark: {
    surface: nexoraPrimitives.darkBg,
    surfaceRaised: nexoraPrimitives.darkPaper,
    section: nexoraPrimitives.darkPaper,
    text: nexoraPrimitives.slate50,
    textMuted: nexoraPrimitives.slate400,
    textOnDark: nexoraPrimitives.slate50,
    textOnDarkMuted: nexoraPrimitives.slate400,
    border: 'rgba(148, 163, 184, 0.18)',
    borderStrong: 'rgba(94, 228, 240, 0.28)',
    accent: nexoraPrimitives.cyan,
    accentHover: nexoraPrimitives.cyanLight,
    accentReadable: nexoraPrimitives.cyanLight,
    accentOnDark: nexoraPrimitives.cyanLight,
    primary: nexoraPrimitives.cyan,
    primaryDark: nexoraPrimitives.cyanOnLight,
    primaryLight: nexoraPrimitives.cyanLight,
    primaryContrast: nexoraPrimitives.navyDark,
    navBg: nexoraPrimitives.navyDark,
    navHover: nexoraPrimitives.darkHover,
    navColor: nexoraPrimitives.slate400,
    navSelected: nexoraPrimitives.white,
    submenuBg: nexoraPrimitives.darkDeep,
    cardHover: nexoraPrimitives.darkSurface2,
    glass: 'rgba(5, 16, 28, 0.92)',
    focus: nexoraPrimitives.cyanLight,
    link: nexoraPrimitives.cyanLight,
    linkHover: nexoraPrimitives.cyan,
    compliance: nexoraPrimitives.compliance,
    security: nexoraPrimitives.security,
    statusOk: nexoraPrimitives.cyan,
    statusRunning: nexoraPrimitives.cyanLight,
    statusPending: nexoraPrimitives.slate500,
    heroFrom: nexoraPrimitives.darkDeep,
    heroTo: nexoraPrimitives.navyDark,
    tableHeadBg: nexoraPrimitives.darkSurface2,
    cyanTint: 'rgba(0, 194, 217, 0.14)',
    shadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
  },
};

export const nexoraTypography = {
  fontFamily: {
    /** Dense UI / MUI body — Space Grotesk brand with Inter fallback. */
    sans: "'Space Grotesk', Inter, Segoe UI, system-ui, sans-serif",
    display: "'Space Grotesk', Inter, Segoe UI, system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  scale: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '15px',
    xl: '18px',
    '2xl': '24px',
    '3xl': 'clamp(26px, 4vw, 36px)',
  },
} as const;

/** Status / chip tones — shared by StatusBadge, URS, Validation, Data Products. */
export const nexoraStatus = {
  passBg: '#0D9488',
  passFg: '#FFFFFF',
  failBg: '#B91C1C',
  failFg: '#FFFFFF',
  warnBg: 'rgba(255, 138, 0, 0.14)',
  warnFg: '#9A3412',
  warnSolid: '#B45309',
  infoBg: 'rgba(10, 25, 41, 0.08)',
  infoFg: nexoraPrimitives.navy,
  infoSolid: nexoraPrimitives.cyanOnLight,
  neutralBg: '#E2E8F0',
  neutralFg: nexoraPrimitives.slate700,
  /** Workflow / change-set accents (replaces Material green/red/orange/blue). */
  success: '#0D9488',
  error: '#B91C1C',
  warning: nexoraPrimitives.security,
  active: nexoraPrimitives.cyanOnLight,
  pending: nexoraPrimitives.slate500,
  onAccent: '#FFFFFF',
} as const;

/** @deprecated Prefer `nexoraStatus`; kept for existing StatusBadge imports. */
export const NEXORA_STATUS = nexoraStatus;

/** Legacy flat exports — keep existing NEXORA_* imports working. */
export const NEXORA_NAVY = nexoraPrimitives.navy;
export const NEXORA_NAVY_DARK = nexoraPrimitives.navyDark;
export const NEXORA_CYAN = nexoraPrimitives.cyan;
export const NEXORA_CYAN_LIGHT = nexoraPrimitives.cyanLight;
export const NEXORA_CYAN_DARK = nexoraPrimitives.cyanOnLight;
export const NEXORA_TEXT = nexoraPrimitives.slate800;
export const NEXORA_MUTED = nexoraPrimitives.slate600;
export const NEXORA_BORDER = nexoraPrimitives.slate200;
export const NEXORA_CARD = nexoraPrimitives.white;
export const NEXORA_SURFACE = nexoraPrimitives.surface;
export const NEXORA_SECTION = nexoraPrimitives.section;
export const NEXORA_COMPLIANCE = nexoraPrimitives.compliance;
export const NEXORA_SECURITY = nexoraPrimitives.security;
