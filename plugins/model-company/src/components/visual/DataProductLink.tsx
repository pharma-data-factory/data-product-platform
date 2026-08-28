import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@material-ui/core';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

/**
 * Deep-link into the generic Data Product page with plant context.
 * Does not invent OEE values — destination owns analytics.
 */
export function DataProductLink({
  productName,
  site,
  line,
  equipment,
  label = 'Open Data Product',
  disabled,
  disabledReason = 'DATA PRODUCT NOT CONNECTED',
}: {
  productName?: string;
  site?: string;
  line?: string;
  equipment?: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  if (disabled || !productName) {
    return (
      <Button variant="outlined" size="small" disabled aria-label={disabledReason}>
        {disabledReason}
      </Button>
    );
  }
  const params = new URLSearchParams();
  if (site) params.set('site', site);
  if (line) params.set('line', line);
  if (equipment) params.set('equipment', equipment);
  const qs = params.toString();
  const to = `/data-products/${encodeURIComponent(productName)}${qs ? `?${qs}` : ''}`;

  return (
    <Button
      variant="contained"
      color="primary"
      size="small"
      component={RouterLink}
      to={to}
      endIcon={<OpenInNewIcon fontSize="small" />}
    >
      {label}
    </Button>
  );
}

/**
 * Resolve OEE data-product name from equipment.type only.
 * Never inspect equipment.id — ids are instance names, not product types.
 */
export function resolveOeeProductName(
  _equipmentId: string | undefined,
  equipmentType?: string,
): string | undefined {
  const t = (equipmentType ?? '').toLowerCase();
  if (!t) return undefined;
  if (/checkweigh|weigher/.test(t)) return 'checkweigher-oee';
  if (/fill|assembl|carton|label|pallet|case|serial|test|inspect/.test(t)) {
    return 'equipment-oee';
  }
  return undefined;
}

export function resolveEquipmentProductName(): string {
  return 'equipment-state';
}
