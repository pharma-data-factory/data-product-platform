import { Chip } from '@material-ui/core';
import { NEXORA_TONE, NexoraToneName } from '@internal/plugin-nexora-common';
import { CompatibilityStatus } from '../compatibility';

const TONES: Record<CompatibilityStatus, NexoraToneName> = {
  COMPATIBLE: 'success',
  BREAKING_CHANGE: 'danger',
  UNKNOWN: 'neutral',
};

function styleFor(status: CompatibilityStatus) {
  const tone = NEXORA_TONE[TONES[status]];
  return { backgroundColor: tone.bg, color: tone.fg };
}

export function CompatibilityChip({
  status,
}: {
  status: CompatibilityStatus;
}) {
  return (
    <Chip
      size="small"
      label={status}
      style={styleFor(status)}
      title="Contract compatibility for active consumers. Not GxP validation."
    />
  );
}
