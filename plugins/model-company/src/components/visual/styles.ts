import { makeStyles } from '@material-ui/core';
import {
  NEXORA_BORDER,
  NEXORA_CARD,
  NEXORA_CYAN,
  NEXORA_CYAN_DARK,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_NAVY_DARK,
  NEXORA_STATUS,
  NEXORA_SURFACE,
  NEXORA_TEXT,
} from '@internal/plugin-nexora-common';

/** Align with shared Nexora design tokens. */
export const NX = {
  base: NEXORA_SURFACE,
  card: NEXORA_CARD,
  border: NEXORA_BORDER,
  text: NEXORA_TEXT,
  muted: NEXORA_MUTED,
  navy: NEXORA_NAVY,
  navyDark: NEXORA_NAVY_DARK,
  teal: NEXORA_CYAN,
  tealDark: NEXORA_CYAN_DARK,
  warnBg: NEXORA_STATUS.warnBg,
  warnFg: NEXORA_STATUS.warnFg,
  dangerBg: 'rgba(220, 38, 38, 0.12)',
  dangerFg: NEXORA_STATUS.failBg,
  passBg: 'rgba(13, 148, 136, 0.14)',
  passFg: '#0F766E',
  infoBg: NEXORA_STATUS.infoBg,
  runningBg: 'rgba(0, 194, 217, 0.12)',
  runningFg: '#0E7490',
  idleBg: 'rgba(71, 85, 105, 0.12)',
  idleFg: NEXORA_MUTED,
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
