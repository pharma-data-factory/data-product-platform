import { ComponentType } from 'react';
import { DataProductMetricCards } from '../renderers/DataProductMetricCards';
import type { QueryResult } from '../types';

export interface ExtensionProps {
  productName: string;
  queryResult: QueryResult | null;
  context?: { equipment?: string; site?: string; line?: string };
}

export type DataProductExtension = {
  id: string;
  title: string;
  Component: ComponentType<ExtensionProps>;
};

function OeeDashboardExtension({ queryResult }: ExtensionProps) {
  const row = queryResult?.rows?.[0] ?? {};
  const pct = (v: unknown) =>
    typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v ?? '—');
  return (
    <div>
      <DataProductMetricCards
        metrics={[
          { label: 'OEE', value: pct(row.oee), hint: 'oee-result-v1' },
          { label: 'Availability', value: pct(row.availability) },
          { label: 'Performance', value: pct(row.performance) },
          { label: 'Quality', value: pct(row.quality) },
          {
            label: 'Equipment',
            value: String(row.equipmentId ?? '—'),
          },
        ]}
      />
      <p style={{ color: '#64748B', fontSize: 13, marginTop: 12 }}>
        OEE values are consumed via the Consumption SDK. Calculation remains in the OEE Data
        Product — not in this UI.
      </p>
    </div>
  );
}

const registry = new Map<string, DataProductExtension>();

export function registerDataProductExtension(ext: DataProductExtension) {
  registry.set(ext.id, ext);
}

export function getDataProductExtension(id: string): DataProductExtension | undefined {
  return registry.get(id);
}

export function listDataProductExtensions(): DataProductExtension[] {
  return [...registry.values()];
}

/** Built-in platform extensions registered at module load. */
registerDataProductExtension({
  id: 'oee-dashboard',
  title: 'OEE Dashboard',
  Component: OeeDashboardExtension,
});
