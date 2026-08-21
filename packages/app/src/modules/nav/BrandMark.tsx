import { useId } from 'react';

const CLOUD = '#0B1F3A';
const FACTORY = '#0D9488';
const DX = '#14B8A6';
const FILL = '#071525';

export function BrandMark({ size = 34 }: Readonly<{ size?: number }>) {
  const uid = useId().replaceAll(':', '');
  const gradientId = `pdf-lg-${uid}`;

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
          <stop offset="0%" stopColor={CLOUD} />
          <stop offset="55%" stopColor={FACTORY} />
          <stop offset="100%" stopColor={DX} />
        </linearGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        opacity="0.5"
      />
      <path
        d="M24 10 L36 20 L32 34 L16 34 L12 20 Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M24 10 L24 22 M12 20 L24 22 M36 20 L24 22 M16 34 L24 22 M32 34 L24 22"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.4"
        opacity="0.6"
      />
      {[
        [24, 10],
        [36, 20],
        [32, 34],
        [16, 34],
        [12, 20],
      ].map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="3.2"
          fill={FILL}
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
        />
      ))}
      <circle cx="24" cy="22" r="3.6" fill={`url(#${gradientId})`} />
    </svg>
  );
}
