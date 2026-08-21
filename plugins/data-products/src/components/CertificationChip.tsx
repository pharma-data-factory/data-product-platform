import { CertificationStatus } from '../model';
import { StatusChip } from './StatusChip';

export function CertificationChip({
  status,
}: {
  status: CertificationStatus;
}) {
  return <StatusChip status={status} kind="certification" />;
}
