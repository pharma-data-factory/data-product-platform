import { Chip } from '@material-ui/core';
import { PlatformCiStatus } from '../ciStatus';

const STYLES: Record<PlatformCiStatus, { backgroundColor: string; color: string }> =
  {
    PASSED: { backgroundColor: '#2e7d32', color: '#fff' },
    FAILED: { backgroundColor: '#c62828', color: '#fff' },
    RUNNING: { backgroundColor: '#1565c0', color: '#fff' },
    CANCELLED: { backgroundColor: '#616161', color: '#fff' },
    UNKNOWN: { backgroundColor: '#9e9e9e', color: '#fff' },
  };

export function CiStatusChip({ status }: { status: PlatformCiStatus }) {
  return (
    <Chip
      size="small"
      label={status}
      style={STYLES[status]}
      title="Latest GitHub Actions quality-gate result. Not GxP or regulatory validation."
    />
  );
}
