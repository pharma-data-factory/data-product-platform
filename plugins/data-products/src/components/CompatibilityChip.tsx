import { Chip } from '@material-ui/core';
import { CompatibilityStatus } from '../compatibility';

const COLORS: Record<
  CompatibilityStatus,
  'default' | 'primary' | 'secondary'
> = {
  COMPATIBLE: 'primary',
  BREAKING_CHANGE: 'secondary',
  UNKNOWN: 'default',
};

export function CompatibilityChip({
  status,
}: {
  status: CompatibilityStatus;
}) {
  return (
    <Chip
      size="small"
      color={COLORS[status]}
      label={status}
      title="Contract compatibility for active consumers. Not GxP validation."
    />
  );
}
