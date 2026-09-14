import { Chip } from '@material-ui/core';
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';
import type { CertificationTier } from '../tier';

// Drawn from the shared ramp so a plugin's status reads the same as the same
// status anywhere else in the platform.
const PASS_BG = NEXORA_TONE.success.bg;
const WARN_BG = NEXORA_TONE.warning.bg;
const WARN_FG = NEXORA_TONE.warning.fg;
const INFO_BG = NEXORA_TONE.info.bg;
const NEUTRAL_BG = NEXORA_TONE.neutral.bg;
const NEUTRAL_FG = NEXORA_TONE.neutral.fg;
const CERTIFIED_BG = NEXORA_TONE.active.bg;
const VALIDATED_BG = NEXORA_TONE.success.bg;

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
    return { backgroundColor: PASS_BG, color: NEXORA_CARD };
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
      return { backgroundColor: VALIDATED_BG, color: NEXORA_CARD };
    case 'Certified':
      return { backgroundColor: CERTIFIED_BG, color: NEXORA_CARD };
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
      <span style={{ color: NEXORA_GREY[900] }}>{value || '—'}</span>
    </div>
  );
}
