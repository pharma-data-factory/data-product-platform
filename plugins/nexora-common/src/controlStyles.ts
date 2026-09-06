/**
 * Shared interactive control styles for Nexora surfaces.
 * Keep Marketplace, Developer Hub, and Admin pages on the same vocabulary:
 * - Primary: theme primary fill
 * - Filter chip: pill, primary when selected
 * - Table action: compact outlined button
 *
 * All colors resolve through the active MUI theme so the controls stay
 * readable in both the light and dark Control Plane themes.
 */
import { Theme } from '@material-ui/core/styles';
import {
  NEXORA_BORDER,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_CYAN_LIGHT,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_TEXT,
} from './tokens';

export const NEXORA_CONTROL = {
  radius: 10,
  pillRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  navy: NEXORA_NAVY,
  navyDark: NEXORA_NAVY_DARK,
  teal: NEXORA_CYAN,
  tealDark: NEXORA_CYAN_DARK,
  tealLight: NEXORA_CYAN_LIGHT,
  text: NEXORA_TEXT,
  muted: NEXORA_MUTED,
  border: NEXORA_BORDER,
  chipIdleBg: '#F1F5F9',
} as const;

export const primaryButtonSx = (theme: Theme) => ({
  background: theme.palette.primary.main,
  borderRadius: NEXORA_CONTROL.radius,
  color: theme.palette.primary.contrastText,
  fontSize: NEXORA_CONTROL.fontSize,
  fontWeight: NEXORA_CONTROL.fontWeight,
  padding: '8px 14px',
  textDecoration: 'none',
  textTransform: 'none' as const,
  '&:hover': {
    background: theme.palette.primary.dark,
    textDecoration: 'none',
  },
});

export const filterChipSx = (theme: Theme, selected: boolean) => ({
  background: selected
    ? theme.palette.primary.main
    : theme.palette.background.default,
  border: selected
    ? `1px solid ${theme.palette.primary.main}`
    : `1px solid ${theme.palette.divider}`,
  borderRadius: NEXORA_CONTROL.pillRadius,
  color: selected
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary,
  fontSize: 12,
  fontWeight: NEXORA_CONTROL.fontWeight,
  height: 32,
  textTransform: 'none' as const,
  '&:hover': {
    background: selected
      ? theme.palette.primary.dark
      : theme.palette.action.hover,
  },
});

export const outlineButtonSx = (theme: Theme) => ({
  background: 'transparent',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: NEXORA_CONTROL.radius,
  color: theme.palette.text.primary,
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
});
