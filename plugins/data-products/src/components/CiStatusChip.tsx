import { Chip } from '@material-ui/core';
import { NEXORA_TONE, NexoraToneName } from '@internal/plugin-nexora-common';
import { ciStatusRepresentation, PlatformCiStatus } from '../ciStatus';

const TONES: Record<PlatformCiStatus, NexoraToneName> = {
  PASSED: 'success',
  FAILED: 'danger',
  RUNNING: 'active',
  CANCELLED: 'neutral',
  UNKNOWN: 'neutral',
};

function styleFor(status: PlatformCiStatus) {
  const tone = NEXORA_TONE[TONES[status]];
  return { backgroundColor: tone.bg, color: tone.fg };
}

export function CiStatusChip({ status }: { status: PlatformCiStatus }) {
  return (
    <Chip
      size="small"
      label={ciStatusRepresentation(status)}
      style={styleFor(status)}
      title="Latest GitHub Actions quality-gate result. Not GxP or regulatory validation."
    />
  );
}
