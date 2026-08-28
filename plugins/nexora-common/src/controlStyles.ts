/**
 * Shared interactive control styles for Nexora surfaces.
 * Keep Marketplace, Developer Hub, and Admin pages on the same vocabulary:
 * - Primary: navy fill
 * - Accent: teal fill (CTAs on dark heroes)
 * - Ghost: outline on dark
 * - Filter chip: pill, navy when selected
 * - Table action: compact outlined button
 */
export const NEXORA_CONTROL = {
  radius: 10,
  pillRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  navy: '#0A1929',
  navyDark: '#05101C',
  teal: '#00C2D9',
  tealDark: '#0098AB',
  tealLight: '#5EE4F0',
  text: '#0F172A',
  muted: '#475569',
  border: '#E8EEF2',
  chipIdleBg: '#F1F5F9',
} as const;

export const primaryButtonSx = {
  background: NEXORA_CONTROL.navy,
  borderRadius: NEXORA_CONTROL.radius,
  color: '#FFFFFF',
  fontSize: NEXORA_CONTROL.fontSize,
  fontWeight: NEXORA_CONTROL.fontWeight,
  padding: '8px 14px',
  textDecoration: 'none',
  textTransform: 'none' as const,
  '&:hover': {
    background: NEXORA_CONTROL.navyDark,
    textDecoration: 'none',
  },
};

export const accentButtonSx = {
  background: NEXORA_CONTROL.teal,
  borderRadius: NEXORA_CONTROL.radius,
  color: '#FFFFFF',
  fontSize: NEXORA_CONTROL.fontSize,
  fontWeight: NEXORA_CONTROL.fontWeight,
  padding: '8px 14px',
  textDecoration: 'none',
  textTransform: 'none' as const,
  '&:hover': {
    background: NEXORA_CONTROL.tealDark,
    textDecoration: 'none',
  },
};

export const ghostOnDarkButtonSx = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.28)',
  borderRadius: NEXORA_CONTROL.radius,
  color: '#F8FAFC',
  fontSize: NEXORA_CONTROL.fontSize,
  fontWeight: NEXORA_CONTROL.fontWeight,
  padding: '8px 14px',
  textDecoration: 'none',
  textTransform: 'none' as const,
  '&:hover': {
    background: 'rgba(0,194,217,0.14)',
    borderColor: NEXORA_CONTROL.tealLight,
    textDecoration: 'none',
  },
};

export const filterChipSx = (selected: boolean) => ({
  background: selected ? NEXORA_CONTROL.navy : NEXORA_CONTROL.chipIdleBg,
  border: selected
    ? `1px solid ${NEXORA_CONTROL.navy}`
    : `1px solid ${NEXORA_CONTROL.border}`,
  borderRadius: NEXORA_CONTROL.pillRadius,
  color: selected ? '#FFFFFF' : NEXORA_CONTROL.text,
  fontSize: 12,
  fontWeight: NEXORA_CONTROL.fontWeight,
  height: 32,
  textTransform: 'none' as const,
  '&:hover': {
    background: selected ? NEXORA_CONTROL.navyDark : '#E2E8F0',
  },
});

export const outlineButtonSx = {
  background: 'transparent',
  border: `1px solid ${NEXORA_CONTROL.border}`,
  borderRadius: NEXORA_CONTROL.radius,
  color: NEXORA_CONTROL.navy,
  fontSize: 12,
  fontWeight: NEXORA_CONTROL.fontWeight,
  padding: '6px 12px',
  textDecoration: 'none',
  textTransform: 'none' as const,
  '&:hover': {
    background: 'rgba(0,194,217,0.08)',
    borderColor: NEXORA_CONTROL.teal,
    textDecoration: 'none',
  },
};
