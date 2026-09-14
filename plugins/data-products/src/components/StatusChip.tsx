import { Chip } from '@material-ui/core';
import {
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_NAVY,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';
import { QualityStatus } from '../model';

// CERTIFIED used brand cyan under white text — 2.16:1, unreadable. The
// readable counterpart keeps the cyan identity; the maturity ladder still
// reads grey -> navy -> cyan.
const STYLES: Record<QualityStatus, { backgroundColor: string; color: string }> =
  {
    // Filled grey under white text (7.58:1). The ramp's `neutral` tone is the
    // inverse — light fill, dark text — and would only reach 2.18:1 here.
    DEVELOPMENT: { backgroundColor: NEXORA_GREY[600], color: NEXORA_CARD },
    TESTED: { backgroundColor: NEXORA_NAVY, color: NEXORA_TONE.active.fg },
    CERTIFIED: {
      backgroundColor: NEXORA_TONE.active.bg,
      color: NEXORA_TONE.active.fg,
    },
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
