import { Chip } from '@material-ui/core';
import { UpgradeStatus } from '../upgrade';

const COLORS: Record<UpgradeStatus, 'default' | 'primary' | 'secondary'> = {
  CURRENT: 'primary',
  UPDATE_AVAILABLE: 'default',
  UPGRADE_REQUIRED: 'secondary',
  UNSUPPORTED: 'default',
};

export function UpgradeChip({ status }: { status: UpgradeStatus }) {
  return (
    <Chip
      size="small"
      color={COLORS[status]}
      label={status}
      title="Technical platform upgrade status only. Repositories are not changed automatically."
    />
  );
}
