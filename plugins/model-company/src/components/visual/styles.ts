import { makeStyles } from '@material-ui/core';
import {
  NEXORA_BORDER,
  NEXORA_CARD,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_GREY,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_SURFACE,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';

/** Align with packages/app theme tokens (Nexora navy / teal). */
export const NX = {
  base: NEXORA_SURFACE,
  card: NEXORA_CARD,
  border: NEXORA_BORDER,
  text: NEXORA_GREY[900],
  muted: NEXORA_GREY[600],
  navy: NEXORA_NAVY,
  navyDark: NEXORA_NAVY_DARK,
  teal: NEXORA_CYAN,
  tealDark: NEXORA_CYAN_DARK,
  warnBg: 'rgba(255, 138, 0, 0.14)',
  warnFg: NEXORA_TONE.warning.fg,
  dangerBg: 'rgba(220, 38, 38, 0.12)',
  dangerFg: NEXORA_TONE.danger.bg,
  passBg: 'rgba(13, 148, 136, 0.14)',
  passFg: NEXORA_TONE.success.bg,
  infoBg: 'rgba(10, 25, 41, 0.08)',
  runningBg: 'rgba(0, 194, 217, 0.12)',
  runningFg: '#0E7490',
  idleBg: 'rgba(71, 85, 105, 0.12)',
  idleFg: NEXORA_GREY[600],
} as const;

export const useVisualStyles = makeStyles({
  flowRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 12,
    width: '100%',
  },
  flowCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    width: '100%',
  },
  connector: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: NX.muted,
    fontSize: 18,
    minWidth: 24,
    alignSelf: 'center',
    userSelect: 'none',
  },
  nodeCard: {
    background: NX.card,
    border: `1px solid ${NX.border}`,
    borderRadius: 12,
    padding: '14px 16px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    width: '100%',
    minWidth: 0,
    '&:hover, &:focus-visible': {
      borderColor: NX.teal,
      boxShadow: `0 0 0 2px ${NX.runningBg}`,
      outline: 'none',
    },
  },
  nodeTitle: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontWeight: 600,
    fontSize: 15,
    color: NX.text,
    margin: 0,
  },
  nodeId: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 11,
    color: NX.muted,
    marginTop: 2,
  },
  nodeMeta: {
    fontSize: 12,
    color: NX.muted,
    marginTop: 8,
    lineHeight: 1.45,
  },
  empty: {
    padding: '20px 16px',
    background: NX.base,
    borderRadius: 10,
    color: NX.muted,
    fontSize: 14,
  },
  '@media (prefers-reduced-motion: reduce)': {
    pulse: {
      animation: 'none !important',
    },
  },
  pulse: {
    animation: '$pulse 2.4s ease-in-out infinite',
  },
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.55 },
  },
});
