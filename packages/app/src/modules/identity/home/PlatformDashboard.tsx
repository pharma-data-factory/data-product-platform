import { NX } from './icons';

export function PlatformDashboard({
  label,
  nav,
  metrics,
}: Readonly<{
  label: string;
  nav: readonly string[];
  metrics: readonly { label: string; value: string; hint: string }[];
}>) {
  return (
    <aside className="nx-dashboard" aria-label={label}>
      <div className="nx-dash-nav" aria-label={nav[0]}>
        {nav.map((item, index) => (
          <span key={item} className={index === 0 ? 'nx-dash-nav-active' : undefined}>
            {item}
          </span>
        ))}
      </div>
      <div className="nx-dash-main">
        <p className="nx-dash-kicker">{label}</p>
        <div className="nx-dash-metrics">
          {metrics.map(item => (
            <div key={item.label} className="nx-dash-metric">
              <span className="nx-dash-metric-label">{item.label}</span>
              <strong>{item.value}</strong>
              <span className="nx-dash-metric-hint">{item.hint}</span>
            </div>
          ))}
        </div>
        <svg className="nx-dash-chart" viewBox="0 0 220 56" aria-hidden="true">
          <defs>
            <linearGradient id="nx-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NX.cyan} stopOpacity="0.35" />
              <stop offset="100%" stopColor={NX.cyan} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 42 C18 40, 28 28, 44 30 C60 32, 72 18, 90 20 C108 22, 118 12, 138 16 C158 20, 170 10, 188 14 C200 16, 210 22, 220 18 L220 56 L0 56 Z"
            fill="url(#nx-chart-fill)"
          />
          <path
            d="M0 42 C18 40, 28 28, 44 30 C60 32, 72 18, 90 20 C108 22, 118 12, 138 16 C158 20, 170 10, 188 14 C200 16, 210 22, 220 18"
            fill="none"
            stroke={NX.cyanBright}
            strokeWidth="1.6"
          />
        </svg>
      </div>
    </aside>
  );
}
