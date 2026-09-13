import { Chip } from '@material-ui/core';
import {
  NEXORA_CYAN,
  NEXORA_MUTED,
  NEXORA_NAVY,
  NEXORA_STATUS,
} from '@internal/plugin-nexora-common';
import { QualityStatus } from '../model';

const STYLES: Record<QualityStatus, { backgroundColor: string; color: string }> =
  {
    DEVELOPMENT: { backgroundColor: NEXORA_MUTED, color: NEXORA_STATUS.onAccent },
    TESTED: { backgroundColor: NEXORA_NAVY, color: NEXORA_STATUS.onAccent },
    CERTIFIED: { backgroundColor: NEXORA_CYAN, color: NEXORA_STATUS.onAccent },
  };

export function StatusChip({
  status,
  kind = 'certification',
}: {
  status: QualityStatus;
  kind?: 'quality' | 'certification';
}) {
  const title =
    kind === 'quality'
      ? 'Technical quality status only. Not GxP or regulatory validation.'
      : 'Technical platform certification only. Not GxP or regulatory validation.';

  return (
    <Chip
      size="small"
      label={status}
      title={title}
      style={STYLES[status]}
    />
  );
}
