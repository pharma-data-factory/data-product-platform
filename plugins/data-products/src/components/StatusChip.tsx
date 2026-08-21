import { Chip } from '@material-ui/core';
import { QualityStatus } from '../model';

const STYLES: Record<QualityStatus, { backgroundColor: string; color: string }> =
  {
    DEVELOPMENT: { backgroundColor: '#64748B', color: '#FFFFFF' },
    TESTED: { backgroundColor: '#0B1F3A', color: '#FFFFFF' },
    CERTIFIED: { backgroundColor: '#0D9488', color: '#FFFFFF' },
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
