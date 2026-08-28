import { Chip } from '@material-ui/core';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import ReportProblemOutlinedIcon from '@material-ui/icons/ReportProblemOutlined';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import { NX } from './styles';

export type StatusKind =
  | 'RUNNING'
  | 'IDLE'
  | 'MICROSTOP'
  | 'BREAKDOWN'
  | 'BLOCKED'
  | 'QUALITY_HOLD'
  | 'COMPLETED'
  | 'RECEIVING'
  | 'STOPPED'
  | 'SETUP'
  | 'CHANGEOVER'
  | 'MATERIAL_STARVED'
  | 'MAINTENANCE'
  | 'OFF'
  | 'RELEASED'
  | 'AVAILABLE'
  | 'STAGED'
  | 'CONSUMED'
  | 'RECEIVED'
  | string;

function styleFor(status: string): { bg: string; fg: string; Icon: typeof PlayCircleOutlineIcon } {
  const s = status.toUpperCase();
  if (s === 'RUNNING' || s === 'RECEIVING') {
    return { bg: NX.runningBg, fg: NX.runningFg, Icon: PlayCircleOutlineIcon };
  }
  if (s === 'COMPLETED' || s === 'RELEASED' || s === 'RECEIVED' || s === 'AVAILABLE') {
    return { bg: NX.passBg, fg: NX.passFg, Icon: CheckCircleOutlineIcon };
  }
  if (s === 'MICROSTOP' || s === 'CHANGEOVER' || s === 'SETUP' || s === 'STAGED') {
    return { bg: NX.warnBg, fg: NX.warnFg, Icon: ReportProblemOutlinedIcon };
  }
  if (
    s === 'BREAKDOWN' ||
    s === 'BLOCKED' ||
    s === 'QUALITY_HOLD' ||
    s === 'MATERIAL_STARVED' ||
    s.includes('BLOCKED')
  ) {
    return { bg: NX.dangerBg, fg: NX.dangerFg, Icon: ErrorOutlineIcon };
  }
  if (s === 'STOPPED' || s === 'IDLE' || s === 'OFF' || s === 'MAINTENANCE' || s === 'CONSUMED') {
    return { bg: NX.idleBg, fg: NX.idleFg, Icon: PauseCircleOutlineIcon };
  }
  return { bg: NX.infoBg, fg: NX.muted, Icon: HourglassEmptyIcon };
}

export function StatusBadge({
  status,
  label,
}: {
  status: StatusKind;
  /** Optional override label (defaults to status). */
  label?: string;
}) {
  const text = String(label ?? status ?? 'UNKNOWN');
  const { bg, fg, Icon } = styleFor(text);
  return (
    <Chip
      size="small"
      icon={<Icon style={{ color: fg, fontSize: 16 }} />}
      label={text.replace(/_/g, ' ')}
      style={{
        background: bg,
        color: fg,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: '0.02em',
      }}
      aria-label={`Status: ${text}`}
    />
  );
}
