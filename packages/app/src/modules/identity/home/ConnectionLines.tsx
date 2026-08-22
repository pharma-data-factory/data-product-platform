import type { CSSProperties } from 'react';
import { NX } from './icons';

const PATHS: Record<
  string,
  { d: string; duration: string; delay: string }
> = {
  erp: { d: 'M90 120 C180 150, 240 200, 340 250', duration: '2.2s', delay: '0s' },
  mes: { d: 'M90 260 C190 260, 250 255, 340 250', duration: '2.7s', delay: '0.35s' },
  lims: { d: 'M90 400 C190 340, 250 280, 340 250', duration: '2.5s', delay: '0.7s' },
  ewm: { d: 'M710 120 C620 150, 560 200, 460 250', duration: '2.3s', delay: '0.15s' },
  historian: { d: 'M710 260 C610 260, 550 255, 460 250', duration: '2.8s', delay: '0.5s' },
  cdmo: { d: 'M710 400 C610 340, 550 280, 460 250', duration: '3s', delay: '0.9s' },
  apis: { d: 'M340 310 C280 360, 200 430, 130 500', duration: '2.4s', delay: '0.2s' },
  events: { d: 'M370 318 C330 380, 280 440, 250 500', duration: '2.6s', delay: '0.6s' },
  mqtt: { d: 'M400 322 C400 390, 400 450, 400 500', duration: '1.7s', delay: '0.1s' },
  rest: { d: 'M430 318 C470 380, 520 440, 550 500', duration: '2.5s', delay: '0.4s' },
  files: { d: 'M460 310 C520 360, 600 430, 670 500', duration: '3.2s', delay: '0.8s' },
};

function flowOpacity(lit: boolean, strong: boolean): number {
  if (lit && strong) {
    return 1;
  }
  if (lit) {
    return 0.7;
  }
  return 0.14;
}

function packetOffset(duration: string, delay: string): string {
  return `${Number.parseFloat(delay) + Number.parseFloat(duration) / 2}s`;
}

export function ConnectionLines({
  active,
}: Readonly<{ active: string | null }>) {
  return (
    <svg
      className="nx-lines"
      viewBox="0 0 800 560"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {Object.entries(PATHS).map(([id, flow]) => {
        const lit = !active || active === id || active === 'core';
        const strong = active === id || active === 'core';
        const className = [
          id,
          'nx-flow',
          lit ? 'nx-flow-on' : 'nx-flow-off',
          strong ? 'nx-flow-strong' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <g
            key={id}
            className={className}
            opacity={flowOpacity(lit, strong)}
            style={
              {
                '--nx-flow-dur': flow.duration,
                '--nx-flow-delay': flow.delay,
              } as CSSProperties
            }
          >
            <path
              d={flow.d}
              fill="none"
              stroke={NX.cyan}
              strokeWidth={strong ? 1.6 : 1.2}
              className="nx-flow-base"
            />
            <path
              d={flow.d}
              fill="none"
              stroke={NX.cyanBright}
              strokeWidth={strong ? 2.4 : 1.8}
              strokeLinecap="round"
              className="nx-flow-dash"
            />
            <circle
              r={strong ? 3.2 : 2.4}
              fill={NX.cyanBright}
              className="nx-flow-packet"
            >
              <animateMotion
                dur={flow.duration}
                begin={flow.delay}
                repeatCount="indefinite"
                path={flow.d}
              />
            </circle>
            <circle
              r={strong ? 2.2 : 1.6}
              fill="#ECFEFF"
              className="nx-flow-packet"
            >
              <animateMotion
                dur={flow.duration}
                begin={packetOffset(flow.duration, flow.delay)}
                repeatCount="indefinite"
                path={flow.d}
              />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
