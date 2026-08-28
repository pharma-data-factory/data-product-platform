import { Chip } from '@material-ui/core';
import { CompatibilityStatus } from '../compatibility';

const STYLES: Record<
  CompatibilityStatus,
  { backgroundColor: string; color: string }
> = {
  COMPATIBLE: { backgroundColor: '#0D9488', color: '#FFFFFF' },
  BREAKING_CHANGE: { backgroundColor: '#B91C1C', color: '#FFFFFF' },
  UNKNOWN: { backgroundColor: '#E2E8F0', color: '#334155' },
};

export function CompatibilityChip({
  status,
}: {
  status: CompatibilityStatus;
}) {
  return (
    <Chip
      size="small"
      label={status}
      style={STYLES[status]}
      title="Contract compatibility for active consumers. Not GxP validation."
    />
  );
}
