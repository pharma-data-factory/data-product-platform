import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import { EquipmentNode } from './AreaNode';
import { useVisualStyles } from './styles';
import type { EquipmentRuntime, FactoryLine } from '../../factoryModel';
import { humanizeId } from '../../factoryModel';

export function LineFlow({
  line,
  runtimeById,
  onSelectEquipment,
}: {
  line: FactoryLine;
  runtimeById: Record<string, EquipmentRuntime | undefined>;
  onSelectEquipment?: (equipmentId: string) => void;
}) {
  const classes = useVisualStyles();
  const theme = useTheme();
  const horizontal = useMediaQuery(theme.breakpoints.up('lg'));
  const equipment = line.equipment ?? [];

  if (!equipment.length) {
    return (
      <Typography color="textSecondary">No equipment configured on this line.</Typography>
    );
  }

  return (
    <div>
      <Typography
        variant="h6"
        style={{
          fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
          marginBottom: 16,
        }}
      >
        {line.name} — {line.id}
      </Typography>
      <div
        className={horizontal ? classes.flowRow : classes.flowCol}
        role="list"
        aria-label={`Equipment on ${line.id}`}
      >
        {equipment.map((eq, index) => (
          <div
            key={eq.id}
            role="listitem"
            style={{
              display: 'flex',
              flexDirection: horizontal ? 'row' : 'column',
              alignItems: 'stretch',
            }}
          >
            <EquipmentNode
              name={humanizeId(eq.type || eq.id)}
              equipmentId={eq.id}
              runtime={runtimeById[eq.id] ?? eq.runtime}
              onSelect={() => onSelectEquipment?.(eq.id)}
            />
            {index < equipment.length - 1 && (
              <div className={classes.connector} aria-hidden>
                {horizontal ? '→' : '↓'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
