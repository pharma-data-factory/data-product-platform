import type { CSSProperties, ReactNode } from 'react';
import {
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_TEAL,
  PHARMA_TEAL_LIGHT,
} from '../../theme/tokens';

export const NX = {
  bg: PHARMA_NAVY,
  bgDeep: PHARMA_NAVY_DARK,
  surface: PHARMA_NAVY,
  surface2: '#12243A',
  cyan: PHARMA_TEAL,
  cyanBright: PHARMA_TEAL_LIGHT,
  cyanSoft: PHARMA_TEAL_LIGHT,
  text: '#f8fafc',
  muted: '#b6c3d2',
  border: 'rgba(94, 228, 240, 0.22)',
  borderStrong: 'rgba(0, 194, 217, 0.45)',
} as const;

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export type NxIconName =
  | 'erp'
  | 'mes'
  | 'lims'
  | 'ewm'
  | 'historian'
  | 'cmo'
  | 'apis'
  | 'events'
  | 'mqtt'
  | 'rest'
  | 'files'
  | 'shield'
  | 'puzzle'
  | 'trend'
  | 'lock';

export function NxIcon({
  name,
  size = 28,
}: Readonly<{ name: NxIconName; size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      {name === 'erp' ? (
        <g {...STROKE}>
          <path d="M6 23 V11 l8 -6 8 6 v12" />
          <path d="M11 23 v-7 h6 v7" />
          <path d="M10 14 h3 M15 14 h3" />
        </g>
      ) : null}
      {name === 'mes' ? (
        <g {...STROKE}>
          <path d="M4 22 h20 M7 22 V10 h5 v12 M16 22 V13 h6 v9" />
          <path d="M7 10 l2.5 -4 h9 l2.5 4" />
        </g>
      ) : null}
      {name === 'lims' ? (
        <g {...STROKE}>
          <path d="M11 4 h6 M12 4 v6 l-4.5 11 h13 l-4.5 -11 V4" />
          <path d="M10.5 16 h7" />
        </g>
      ) : null}
      {name === 'ewm' ? (
        <g {...STROKE}>
          <path d="M5 12 l9 -5.5 9 5.5 v9.5 H5 z" />
          <path d="M14 6.5 V21.5 M5 12 h18" />
        </g>
      ) : null}
      {name === 'historian' ? (
        <g {...STROKE}>
          <ellipse cx="14" cy="7.5" rx="8" ry="3" />
          <path d="M6 7.5 v13 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3 v-13" />
          <path d="M6 14 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3" />
        </g>
      ) : null}
      {name === 'cmo' ? (
        <g {...STROKE}>
          <circle cx="10" cy="10" r="3" />
          <circle cx="18.5" cy="11" r="2.4" />
          <path d="M5 21 c0 -3.2 2.2 -5.2 5 -5.2 s5 2 5 5.2" />
          <path d="M15.2 21 c0.2 -2.4 1.6 -4.2 3.3 -4.2 2.1 0 3.5 1.6 3.5 4.2" />
        </g>
      ) : null}
      {name === 'apis' ? <path {...STROKE} d="M10 7 L5 14 L10 21 M18 7 L23 14 L18 21" /> : null}
      {name === 'events' ? (
        <g {...STROKE}>
          <circle cx="14" cy="14" r="2.1" />
          <path d="M9.4 9.4 a6.5 6.5 0 0 1 9.2 0 M6.8 6.8 a10.2 10.2 0 0 1 14.4 0 M9.4 18.6 a6.5 6.5 0 0 0 9.2 0 M6.8 21.2 a10.2 10.2 0 0 0 14.4 0" />
        </g>
      ) : null}
      {name === 'mqtt' ? (
        <g {...STROKE}>
          <path d="M5 16.5 a9 9 0 0 1 18 0" />
          <path d="M8.5 16.5 a5.5 5.5 0 0 1 11 0" />
          <path d="M12 16.5 a2 2 0 0 1 4 0" />
          <circle cx="14" cy="20" r="1.3" fill="currentColor" stroke="none" />
        </g>
      ) : null}
      {name === 'rest' ? (
        <g {...STROKE}>
          <circle cx="14" cy="14" r="8" />
          <path d="M6 14 h16 M14 6 c3.4 3.2 3.4 12.8 0 16 M14 6 c-3.4 3.2 -3.4 12.8 0 16" />
        </g>
      ) : null}
      {name === 'files' ? (
        <g {...STROKE}>
          <path d="M8 5 h8 l5 5 v13 H8 z" />
          <path d="M16 5 v5 h5 M11 15 h7 M11 18.5 h5" />
        </g>
      ) : null}
      {name === 'shield' ? (
        <g {...STROKE}>
          <path d="M14 4 l9 3.5 v7 c0 6.2 -4 10.5 -9 12 -5 -1.5 -9 -5.8 -9 -12 v-7 z" />
          <path d="M10 14 l2.8 2.8 L18.5 11" />
        </g>
      ) : null}
      {name === 'puzzle' ? (
        <g {...STROKE}>
          <path d="M6 8 h6 c0 2.3 3.4 2.3 3.4 0 h6.6 v6 c-2.3 0 -2.3 3.4 0 3.4 v6.6 H15.4 c0 -2.3 -3.4 -2.3 -3.4 0 H6 V17.4 c2.3 0 2.3 -3.4 0 -3.4 z" />
        </g>
      ) : null}
      {name === 'trend' ? (
        <g {...STROKE}>
          <path d="M5 20 L11 12 L16 15.5 L23 6" />
          <path d="M17 6 h6 v6" />
        </g>
      ) : null}
      {name === 'lock' ? (
        <g {...STROKE}>
          <rect x="7" y="13" width="14" height="10" rx="2" />
          <path d="M10.5 13 V10 a3.5 3.5 0 0 1 7 0 v3" />
        </g>
      ) : null}
    </svg>
  );
}

export function nodeButtonStyle(active: boolean): CSSProperties {
  return {
    width: 92,
    height: 92,
    borderRadius: 16,
    border: `1px solid ${active ? NX.borderStrong : NX.border}`,
    background: `linear-gradient(180deg, ${NX.surface2} 0%, ${NX.surface} 100%)`,
    color: NX.cyanBright,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: active
      ? `0 0 0 1px ${NX.borderStrong}, 0 12px 28px rgba(0,0,0,0.35)`
      : '0 10px 24px rgba(0,0,0,0.28)',
    cursor: 'pointer',
    padding: 0,
  };
}

export function NodeLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span
      style={{
        color: NX.text,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textAlign: 'center',
        lineHeight: 1.25,
      }}
    >
      {children}
    </span>
  );
}
