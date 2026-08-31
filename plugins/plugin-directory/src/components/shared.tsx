import { Chip } from '@material-ui/core';
import { NEXORA_MUTED, NEXORA_NAVY } from '@internal/plugin-nexora-common';
import type { CertificationTier } from '../tier';

const PASS_BG = '#0D9488';
const WARN_BG = 'rgba(255, 138, 0, 0.14)';
const WARN_FG = '#9A3412';
const INFO_BG = 'rgba(10, 25, 41, 0.08)';
const NEUTRAL_BG = '#E2E8F0';
const NEUTRAL_FG = '#334155';
const CERTIFIED_BG = '#0E7490';
const VALIDATED_BG = '#15803D';

function toneFor(value: string): { backgroundColor: string; color: string } {
  const upper = value.toUpperCase();
  if (
    upper === 'ENABLED' ||
    upper === 'PASS' ||
    upper === 'VALIDATED' ||
    upper === 'YES' ||
    upper === 'COMPLETED' ||
    upper === 'READY'
  ) {
    return { backgroundColor: PASS_BG, color: '#FFFFFF' };
  }
  if (
    upper.includes('NOT_VALIDATED') ||
    upper.includes('NOT VALIDATED') ||
    upper === 'DEVELOPMENT' ||
    upper === 'DEPRECATED' ||
    upper === 'DISABLED'
  ) {
    return { backgroundColor: WARN_BG, color: WARN_FG };
  }
  if (upper === 'VALIDATION' || upper === 'NOT_APPLICABLE') {
    return { backgroundColor: INFO_BG, color: NEXORA_NAVY };
  }
  return { backgroundColor: NEUTRAL_BG, color: NEUTRAL_FG };
}

export function StatusChip({ value }: { value: string }) {
  const tone = toneFor(value);
  return (
    <Chip
      size="small"
      label={value}
      style={{
        backgroundColor: tone.backgroundColor,
        color: tone.color,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    />
  );
}

function tierTone(tier: CertificationTier): {
  backgroundColor: string;
  color: string;
} {
  switch (tier) {
    case 'Validated':
      return { backgroundColor: VALIDATED_BG, color: '#FFFFFF' };
    case 'Certified':
      return { backgroundColor: CERTIFIED_BG, color: '#FFFFFF' };
    case 'Not applicable':
      return { backgroundColor: INFO_BG, color: NEXORA_NAVY };
    case 'Community':
    default:
      return { backgroundColor: NEUTRAL_BG, color: NEUTRAL_FG };
  }
}

export function TierChip({ tier }: { tier: CertificationTier }) {
  const tone = tierTone(tier);
  return (
    <Chip
      size="small"
      label={tier}
      style={{
        backgroundColor: tone.backgroundColor,
        color: tone.color,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    />
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ color: NEXORA_MUTED, fontSize: 14, marginBottom: 8 }}>
      <span style={{ display: 'inline-block', minWidth: 160 }}>{label}</span>
      <span style={{ color: '#0F172A' }}>{value || '—'}</span>
    </div>
  );
}
