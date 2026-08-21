export const DATA_PRODUCT_STANDARD_LINE = '1.0.x';

export const DATA_PRODUCT_COMPATIBILITY_MATRIX = {
  standard: DATA_PRODUCT_STANDARD_LINE,
  compatible: {
    sdk: '1.x',
    templates: {
      'mqtt-temperature-data-product': '1.x',
      'rest-equipment-data-product': '1.x',
      'machine-state-consumer-data-product': '1.x',
      'oee-data-product': '1.x',
    },
  },
} as const;

export const OFFICIAL_DATA_PRODUCT_TEMPLATES = [
  {
    id: 'mqtt-temperature-data-product',
    dir: 'templates/mqtt-temperature-product',
    contractFile: 'contracts/temperature-event.schema.json',
    contractLogicalName: 'temperature-event',
    contractTitle: 'Temperature Event Contract',
  },
  {
    id: 'rest-equipment-data-product',
    dir: 'templates/rest-equipment-product',
    contractFile: 'contracts/equipment-event.schema.json',
    contractLogicalName: 'equipment-event',
    contractTitle: 'Equipment Event Contract',
  },
  {
    id: 'machine-state-consumer-data-product',
    dir: 'templates/machine-state-consumer',
    contractFile: 'contracts/machine-state-event.schema.json',
    contractLogicalName: 'machine-state-event',
    contractTitle: 'Machine State Event Contract',
  },
  {
    id: 'oee-data-product',
    dir: 'templates/oee-data-product',
    contractFile: 'contracts/oee-result.schema.json',
    contractLogicalName: 'oee-result',
    contractTitle: 'OEE Result Contract',
  },
] as const;
