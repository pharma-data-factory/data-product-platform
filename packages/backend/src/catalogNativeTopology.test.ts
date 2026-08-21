import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ENTITIES = path.resolve(__dirname, '../../../catalog/entities.yaml');
const SAMPLES = path.resolve(__dirname, '../../../catalog/samples/entities.yaml');

function loadEntities(): Array<{
  kind?: string;
  metadata?: {
    name?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    type?: string;
    providesApis?: string[];
    consumesApis?: string[];
    dependsOn?: string[];
  };
}> {
  return [
    ...yaml.parseAllDocuments(fs.readFileSync(ENTITIES, 'utf8')),
    ...yaml.parseAllDocuments(fs.readFileSync(SAMPLES, 'utf8')),
  ]
    .map(doc => doc.toJSON())
    .filter(Boolean);
}

function requireEntity(
  entities: ReturnType<typeof loadEntities>,
  name: string,
): NonNullable<ReturnType<typeof loadEntities>[number]> {
  const match = entities.find(entity => entity.metadata?.name === name);
  if (!match) {
    throw new Error(`Missing catalog entity ${name}`);
  }
  return match;
}

describe('sample catalog native topology', () => {
  const entities = loadEntities();
  const mqtt = requireEntity(entities, 'sample-mqtt-temperature-product');
  const consumer = requireEntity(entities, 'temperature-dashboard-consumer');
  const contract = requireEntity(
    entities,
    'sample-mqtt-temperature-product--temperature-event',
  );
  const orders = requireEntity(entities, 'sample-orders-product');
  const equipment = requireEntity(entities, 'sample-rest-equipment-product');
  const equipmentConsumer = requireEntity(entities, 'equipment-dashboard-consumer');
  const equipmentContract = requireEntity(
    entities,
    'sample-rest-equipment-product--equipment-event',
  );
  const machineState = requireEntity(entities, 'sample-machine-state-consumer');
  const machineStateContract = requireEntity(
    entities,
    'sample-machine-state-consumer--machine-state-event',
  );

  it('does not store duplicate topology annotations', () => {
    for (const entity of [
      mqtt,
      consumer,
      orders,
      contract,
      equipment,
      equipmentConsumer,
      equipmentContract,
      machineState,
      machineStateContract,
    ]) {
      const annotations = entity.metadata?.annotations ?? {};
      expect(annotations['dataprod.platform/providesContract']).toBeUndefined();
      expect(annotations['dataprod.platform/consumesContract']).toBeUndefined();
      expect(annotations['dataprod.platform/depends-on']).toBeUndefined();
    }
    expect(
      mqtt.metadata?.annotations?.['dataprod.platform/dataContractVersion'],
    ).toBeUndefined();
  });

  it('uses the temperature-event API as the contract identity', () => {
    expect(contract.kind).toBe('API');
    expect(contract.spec?.type).toBe('contract');
    expect(
      contract.metadata?.annotations?.['dataprod.platform/contract-version'],
    ).toBe('1.1.0');
    expect(mqtt.spec?.providesApis).toEqual([
      'sample-mqtt-temperature-product--temperature-event',
    ]);
    expect(consumer.spec?.consumesApis).toEqual([
      'sample-mqtt-temperature-product--temperature-event',
    ]);
    expect(consumer.spec?.dependsOn).toEqual([
      'component:default/sample-mqtt-temperature-product',
      'api:default/sample-mqtt-temperature-product--temperature-event',
    ]);
    expect(
      consumer.metadata?.annotations?.['dataprod.platform/compatibleVersions'],
    ).toBe('1.x');
    expect(mqtt.metadata?.annotations?.['dataprod.platform/qualityStatus']).toBe(
      'TESTED',
    );
    expect(
      mqtt.metadata?.annotations?.['dataprod.platform/certification-status'],
    ).toBe('DEVELOPMENT');
  });

  it('links the contract API to documentation and source', () => {
    expect(
      contract.metadata?.annotations?.['backstage.io/techdocs-ref'],
    ).toBe('dir:../../docs');
    expect(
      contract.metadata?.annotations?.['backstage.io/source-location'],
    ).toContain('sample-mqtt-temperature-product');
    const links = (contract.metadata as { links?: Array<{ title?: string; url?: string }> })
      .links ?? [];
    expect(links.map(link => link.title)).toEqual(
      expect.arrayContaining(['Repository', 'Documentation', 'Data Contract Schema']),
    );
  });

  it('uses the equipment-event API as the REST equipment contract identity', () => {
    expect(equipmentContract.kind).toBe('API');
    expect(equipmentContract.spec?.type).toBe('contract');
    expect(
      equipmentContract.metadata?.annotations?.['dataprod.platform/contract-version'],
    ).toBe('1.0.0');
    expect(equipment.spec?.providesApis).toEqual([
      'sample-rest-equipment-product--equipment-event',
    ]);
    expect(equipmentConsumer.spec?.consumesApis).toEqual([
      'sample-rest-equipment-product--equipment-event',
    ]);
    expect(equipmentConsumer.spec?.dependsOn).toEqual([
      'component:default/sample-rest-equipment-product',
      'api:default/sample-rest-equipment-product--equipment-event',
    ]);
    expect(
      equipmentConsumer.metadata?.annotations?.['dataprod.platform/compatibleVersions'],
    ).toBe('1.x');
    expect(equipment.metadata?.annotations?.['dataprod.platform/qualityStatus']).toBe(
      'TESTED',
    );
    expect(
      equipment.metadata?.annotations?.['dataprod.platform/dataContractVersion'],
    ).toBeUndefined();
  });

  it('uses native dependsOn from the Machine State Consumer to Unified Namespace', () => {
    expect(machineStateContract.kind).toBe('API');
    expect(machineStateContract.spec?.type).toBe('contract');
    expect(machineState.spec?.dependsOn).toEqual([
      'component:default/unified-namespace',
    ]);
    expect(machineState.spec?.consumesApis).toEqual([
      'unified-namespace--machine-state-event',
    ]);
    expect(machineState.spec?.providesApis).toEqual([
      'sample-machine-state-consumer--machine-state-event',
    ]);
  });
});
