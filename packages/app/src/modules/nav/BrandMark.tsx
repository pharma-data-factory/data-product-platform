import { useId } from 'react';
import { PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const HEX =
  'M24 6 L39.5 14.75 L39.5 33.25 L24 42 L8.5 33.25 L8.5 14.75 Z';

export function BrandMark({ size = 34 }: Readonly<{ size?: number }>) {
  const uid = useId().replaceAll(':', '');
  const gradientId = `nexora-lg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor={PHARMA_NAVY} />
          <stop offset="55%" stopColor={PHARMA_TEAL} />
          <stop offset="100%" stopColor={PHARMA_TEAL_LIGHT} />
        </linearGradient>
      </defs>
      <path
        d={HEX}
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        fill={PHARMA_NAVY_DARK}
        strokeLinejoin="round"
      />
      <path
        d="M16 32.5 V15.5 M32 15.5 V32.5 M16 15.5 L32 32.5"
        stroke={PHARMA_TEAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [16, 15.5],
        [16, 32.5],
        [32, 15.5],
        [32, 32.5],
      ].map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="2.2"
          fill={PHARMA_NAVY_DARK}
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="1.6"
        />
      ))}
    </svg>
  );
}
