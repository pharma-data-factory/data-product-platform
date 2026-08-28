/**
 * Typed factory topology from Model Company API (Factory-as-Code).
 * UI must derive structure from these shapes — never hardcode Autoinjector IDs.
 */

export type EquipmentState =
  | 'OFF'
  | 'IDLE'
  | 'SETUP'
  | 'RUNNING'
  | 'MICROSTOP'
  | 'STOPPED'
  | 'BREAKDOWN'
  | 'MATERIAL_STARVED'
  | 'QUALITY_HOLD'
  | 'MAINTENANCE'
  | 'CHANGEOVER'
  | string;

export interface FactoryEquipment {
  id: string;
  type: string;
  capabilities?: string[];
  lineId: string;
  areaId: string;
  siteId: string;
  runtime?: EquipmentRuntime;
}

export interface EquipmentRuntime {
  state: EquipmentState;
  speed?: number;
  targetSpeed?: number;
  goodCount?: number;
  rejectCount?: number;
  temperatureC?: number;
  reasonCode?: string | null;
  availability?: string;
  lineId?: string;
  areaId?: string;
  siteId?: string;
}

export interface FactoryLine {
  id: string;
  name: string;
  areaId: string;
  siteId: string;
  equipment: FactoryEquipment[];
}

export interface FactoryArea {
  id: string;
  name: string;
  lines: FactoryLine[];
}

export interface FactorySite {
  id: string;
  name: string;
  displayName?: string;
  areas: FactoryArea[];
}

export interface FactoryApiModel {
  company: {
    id: string;
    name: string;
    classification?: Record<string, unknown>;
  };
  uns?: { root?: string; enterpriseId?: string };
  sites: FactorySite[];
  lineCount?: number;
  equipmentCount?: number;
  dataProducts?: unknown[];
}

export interface OrderView {
  orderId: string;
  material: string;
  batch: string;
  targetQuantity: number;
  goodQuantity: number;
  rejectQuantity?: number;
  status: string;
  lineId: string;
  role?: string;
}

export interface BatchView {
  batchId: string;
  materialId: string;
  orderId: string;
  role?: string;
  status: string;
  goodQuantity: number;
  rejectQuantity?: number;
}

export interface GenealogyLink {
  from: string;
  to: string;
  relation: string;
}

export interface WarehouseHu {
  huId: string;
  material: string;
  quantity: number;
  status: string;
  location: string;
  batchId?: string;
  qualityStatus?: string;
  warehouse?: string;
}

/** Normalize nested factory sites so lines always carry area/site ids. */
export function normalizeFactory(model: FactoryApiModel): FactorySite[] {
  return (model.sites ?? []).map(site => ({
    ...site,
    areas: (site.areas ?? []).map(area => ({
      ...area,
      lines: (area.lines ?? []).map(line => ({
        ...line,
        areaId: line.areaId || area.id,
        siteId: line.siteId || site.id,
        equipment: (line.equipment ?? []).map(eq => ({
          ...eq,
          lineId: eq.lineId || line.id,
          areaId: eq.areaId || area.id,
          siteId: eq.siteId || site.id,
        })),
      })),
    })),
  }));
}

export function flattenLines(sites: FactorySite[]): FactoryLine[] {
  return sites.flatMap(s => s.areas.flatMap(a => a.lines));
}

export function flattenEquipment(sites: FactorySite[]): FactoryEquipment[] {
  return flattenLines(sites).flatMap(l => l.equipment);
}

export function findLine(sites: FactorySite[], lineId: string): FactoryLine | undefined {
  return flattenLines(sites).find(l => l.id === lineId);
}

export function findArea(sites: FactorySite[], areaId: string): FactoryArea | undefined {
  for (const site of sites) {
    const area = site.areas.find(a => a.id === areaId);
    if (area) return area;
  }
  return undefined;
}

export function findEquipment(
  sites: FactorySite[],
  equipmentId: string,
): FactoryEquipment | undefined {
  return flattenEquipment(sites).find(e => e.id === equipmentId);
}

/** Aggregate area operational state from equipment runtimes (worst wins). */
export function aggregateAreaState(
  area: FactoryArea,
  runtimeById: Record<string, EquipmentRuntime | undefined>,
): EquipmentState {
  const states = area.lines
    .flatMap(l => l.equipment)
    .map(e => runtimeById[e.id]?.state ?? e.runtime?.state ?? 'IDLE');
  const priority = [
    'BREAKDOWN',
    'QUALITY_HOLD',
    'MATERIAL_STARVED',
    'MICROSTOP',
    'CHANGEOVER',
    'SETUP',
    'RUNNING',
    'STOPPED',
    'IDLE',
    'OFF',
    'MAINTENANCE',
  ];
  for (const p of priority) {
    if (states.includes(p)) return p;
  }
  return states[0] ?? 'IDLE';
}

export function formatQty(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return Math.round(n).toLocaleString();
}

export function humanizeId(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
