import { Chip } from '@material-ui/core';
import { NEXORA_STATUS } from '@internal/plugin-nexora-common';
import { ciStatusRepresentation, PlatformCiStatus } from '../ciStatus';

const STYLES: Record<PlatformCiStatus, { backgroundColor: string; color: string }> =
  {
    PASSED: {
      backgroundColor: NEXORA_STATUS.success,
      color: NEXORA_STATUS.onAccent,
    },
    FAILED: {
      backgroundColor: NEXORA_STATUS.error,
      color: NEXORA_STATUS.onAccent,
    },
    RUNNING: {
      backgroundColor: NEXORA_STATUS.active,
      color: NEXORA_STATUS.onAccent,
    },
    CANCELLED: {
      backgroundColor: NEXORA_STATUS.neutralFg,
      color: NEXORA_STATUS.onAccent,
    },
    UNKNOWN: {
      backgroundColor: NEXORA_STATUS.pending,
      color: NEXORA_STATUS.onAccent,
    },
  };

export function CiStatusChip({ status }: { status: PlatformCiStatus }) {
  return (
    <Chip
      size="small"
      label={ciStatusRepresentation(status)}
      style={STYLES[status]}
      title="Latest GitHub Actions quality-gate result. Not GxP or regulatory validation."
    />
  );
}
