import {
  CapabilityGroup,
  ConnectivityInterface,
  ContractView,
  DataProductHealth,
  EquipmentStateView,
  MetricValue,
  entityNameFromRef,
  okResult,
  unconfiguredResult,
  type ProviderResult,
} from '@internal/platform-common';

const OEE_CAPABILITIES: CapabilityGroup[] = [
  { level: 'INCLUDED', items: ['Quality Loss'] },
  {
    level: 'FOUNDATION',
    items: [
      'Stop Classification',
      'Reason Codes',
      'Unknown Losses',
      'Speed Loss',
      'Changeover Loss',
      'Context',
    ],
  },
  {
    level: 'PLANNED',
    items: [
      'Microstops',
      'Reason Hierarchy',
      'Automatic Reason Detection',
      'Manual Reason Assignment',
      'Pareto Analysis',
      'Frequency Analysis',
      'Duration Analysis',
      'MTBF / MTTR',
      'Minor Stops',
      'Startup Loss',
    ],
  },
];

const metrics: Record<string, MetricValue[]> = {
  'filler-01': [
    { id: 'oee', label: 'Current OEE', value: 82.4, unit: '%', updatedAt: '3 sec ago' },
    { id: 'availability', label: 'Availability', value: 91.2, unit: '%' },
    { id: 'performance', label: 'Performance', value: '92.0', unit: '%' },
    { id: 'quality', label: 'Quality', value: 98.2, unit: '%' },
    { id: 'calculation', label: 'Calculation Status', value: 'COMPLETE' },
    { id: 'throughput', label: 'Throughput', value: '8,430', unit: 'units/h' },
  ],
  'filler-01-oee': [
    { id: 'oee', label: 'Current OEE', value: 82.4, unit: '%' },
    { id: 'availability', label: 'Availability', value: 91.2, unit: '%' },
    { id: 'performance', label: 'Performance', value: '92.0', unit: '%' },
    { id: 'quality', label: 'Quality', value: 98.2, unit: '%' },
  ],
  'dispenser-01': [
    { id: 'last-weight', label: 'Last Weight', value: 24.997, unit: 'kg' },
    { id: 'target', label: 'Target', value: '25.000', unit: 'kg' },
    { id: 'tolerance', label: 'Tolerance', value: '24.950 – 25.050', unit: 'kg' },
    { id: 'status', label: 'Status', value: 'WITHIN_TOLERANCE' },
  ],
  'dispenser-01-weighing': [
    { id: 'last-weight', label: 'Last Weight', value: 24.997, unit: 'kg' },
    { id: 'target', label: 'Target', value: '25.000', unit: 'kg' },
    { id: 'status', label: 'Status', value: 'WITHIN_TOLERANCE' },
  ],
};

const states: Record<string, EquipmentStateView> = {
  'filler-01': { state: 'RUNNING', updatedAt: '3 sec ago' },
  'dispenser-01': { state: 'IDLE', updatedAt: '1 sec ago' },
};

const connectivity: Record<string, ConnectivityInterface[]> = {
  'filler-01': [
    {
      kind: 'MQTT',
      name: 'MQTT',
      state: 'CONNECTED',
      broker: 'factory-broker',
      lastMessage: '2 sec ago',
      rate: '12 msg/s',
    },
    {
      kind: 'REST',
      name: 'Production Context API',
      state: 'CONNECTED',
      endpoint: 'configured',
      latency: '38 ms',
      lastCheck: '5 sec ago',
    },
  ],
  'dispenser-01': [
    {
      kind: 'OPC UA',
      name: 'Dispensing OPC UA',
      state: 'CONNECTED',
      endpoint: 'configured',
      lastMessage: '1 sec ago',
    },
  ],
  'filler-01-oee': [
    {
      kind: 'MQTT',
      name: 'MQTT',
      state: 'CONNECTED',
      broker: 'factory-broker',
      lastMessage: '2 sec ago',
      rate: '12 msg/s',
    },
    {
      kind: 'REST',
      name: 'Context API',
      state: 'CONNECTED',
      latency: '38 ms',
      lastCheck: '5 sec ago',
    },
  ],
};

const quality: Record<string, DataProductHealth> = {
  'filler-01-oee': {
    freshness: { state: 'HEALTHY', label: 'Freshness', value: '3 sec' },
    completeness: { state: 'HEALTHY', label: 'Completeness', value: '99.8 %' },
    schema: { state: 'HEALTHY', label: 'Schema', value: 'Valid' },
    volume: { state: 'HEALTHY', label: 'Volume', value: 'Normal' },
  },
  'dispenser-01-weighing': {
    freshness: { state: 'HEALTHY', label: 'Freshness', value: '1 sec' },
    completeness: { state: 'WARNING', label: 'Completeness', value: '97.1 %' },
    schema: { state: 'HEALTHY', label: 'Schema', value: 'Valid' },
    volume: { state: 'HEALTHY', label: 'Volume', value: 'Normal' },
  },
  'line04-equipment-state': {
    freshness: { state: 'ERROR', label: 'Freshness', value: 'stale', message: 'No event in 90s' },
    completeness: { state: 'UNKNOWN', label: 'Completeness' },
    schema: { state: 'HEALTHY', label: 'Schema', value: 'Valid' },
    volume: { state: 'WARNING', label: 'Volume', value: 'Low' },
  },
};

const contracts: Record<string, ContractView> = {
  'filler-01-oee': {
    name: 'OEE Result Contract',
    version: '1.0',
    format: 'JSON Schema',
    compatibility: 'COMPATIBLE',
    fields: [
      'equipmentId',
      'window',
      'availability',
      'performance',
      'quality',
      'oee',
      'calculationStatus',
    ],
    history: [
      { to: '1.0', status: 'COMPATIBLE', current: true },
      { from: '0.9', to: '1.0', status: 'COMPATIBLE' },
    ],
    catalogApiRef: 'filler-01-oee-api',
    sourceLabel: 'Mock provider',
  },
  'dispenser-01-weighing': {
    name: 'Weigh Result Contract',
    version: '1.0',
    format: 'JSON Schema',
    compatibility: 'COMPATIBLE',
    fields: ['equipmentId', 'weight', 'target', 'tolerance', 'material', 'batch', 'order'],
    history: [{ to: '1.0', status: 'COMPATIBLE', current: true }],
    catalogApiRef: 'dispenser-01-weighing-api',
    sourceLabel: 'Mock provider',
  },
};

const capabilities: Record<string, CapabilityGroup[]> = {
  'filler-01-oee': OEE_CAPABILITIES,
};

function lookup<T>(
  table: Record<string, T>,
  entityRef: string,
  missing: string,
): ProviderResult<T> {
  const name = entityNameFromRef(entityRef);
  if (!name || !table[name]) {
    return unconfiguredResult(missing);
  }
  return okResult(table[name]);
}

export const mockIndustrialProvider = {
  metrics(entityRef: string) {
    return lookup(
      metrics,
      entityRef,
      'No metrics integration configured.',
    );
  },
  state(entityRef: string) {
    return lookup(
      states,
      entityRef,
      'No runtime state integration configured.',
    );
  },
  connectivity(entityRef: string) {
    return lookup(
      connectivity,
      entityRef,
      'The equipment is registered in the catalog, but no connectivity provider is configured.',
    );
  },
  quality(entityRef: string) {
    return lookup(
      quality,
      entityRef,
      'No data-quality provider is configured.',
    );
  },
  contract(entityRef: string) {
    return lookup(
      contracts,
      entityRef,
      'No contract provider is configured. Compatibility is unknown.',
    );
  },
  capabilities(entityRef: string) {
    return lookup(
      capabilities,
      entityRef,
      'No capability metadata is configured for this Data Product.',
    );
  },
};
