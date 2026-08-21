import { QualityStatus } from '../model';
import { StatusChip } from './StatusChip';

export function QualityChip({ status }: { status: QualityStatus }) {
  return <StatusChip status={status} kind="quality" />;
}
