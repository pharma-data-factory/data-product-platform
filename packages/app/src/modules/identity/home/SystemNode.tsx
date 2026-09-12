import { NX, NxIcon, type NxIconName, NodeLabel, nodeButtonStyle } from './icons';
import { C } from '../landingTokens';

export function SystemNode({
  id,
  label,
  icon,
  active,
  optional,
  onActivate,
  onClear,
}: Readonly<{
  id: string;
  label: string;
  icon: NxIconName;
  active: boolean;
  optional?: boolean;
  onActivate: (id: string) => void;
  onClear: () => void;
}>) {
  return (
    <div className={optional ? 'nx-optional' : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        className="pdf-focus nx-system-btn"
        aria-pressed={active}
        aria-label={label}
        onMouseEnter={() => onActivate(id)}
        onMouseLeave={onClear}
        onFocus={() => onActivate(id)}
        onBlur={onClear}
        style={nodeButtonStyle(active)}
      >
        <NxIcon name={icon} size={28} />
      </button>
      <NodeLabel>{label}</NodeLabel>
    </div>
  );
}

export function ProtocolNode({
  id,
  label,
  icon,
  active,
  optional,
  onActivate,
  onClear,
}: Readonly<{
  id: string;
  label: string;
  icon: NxIconName;
  active: boolean;
  optional?: boolean;
  onActivate: (id: string) => void;
  onClear: () => void;
}>) {
  return (
    <button
      type="button"
      className={`pdf-focus nx-protocol ${optional ? 'nx-optional' : ''}`}
      aria-pressed={active}
      aria-label={label}
      onMouseEnter={() => onActivate(id)}
      onMouseLeave={onClear}
      onFocus={() => onActivate(id)}
      onBlur={onClear}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
        padding: '14px 8px 12px',
        borderRadius: 14,
        border: `1px solid ${active ? NX.borderStrong : NX.border}`,
        background: active ? NX.surface2 : 'rgba(5, 16, 28, 0.82)',
        color: NX.cyanBright,
        cursor: 'pointer',
      }}
    >
      <NxIcon name={icon} size={26} />
      <span style={{ color: NX.text, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
        {label}
      </span>
    </button>
  );
}

export function BenefitCard({
  title,
  body,
  icon,
}: Readonly<{ title: string; body: string; icon: NxIconName }>) {
  return (
    <article className="nx-benefit">
      <div className="nx-benefit-icon" aria-hidden="true">
        <NxIcon name={icon} size={26} />
      </div>
      <h3 className="pdf-display" style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 600, color: C.text }}>
        {title}
      </h3>
      <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: C.muted }}>{body}</p>
    </article>
  );
}

