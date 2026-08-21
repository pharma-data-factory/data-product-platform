import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('Unified Namespace platform component', () => {
  it('registers a platform-component, not a data-product', () => {
    const entities = [
      ...yaml.parseAllDocuments(read('catalog/entities.yaml')).map(doc => doc.toJSON()),
      ...yaml.parseAllDocuments(read('catalog/samples/entities.yaml')).map(doc => doc.toJSON()),
    ];
    const uns = entities.find(
      entity => entity.kind === 'Component' && entity.metadata.name === 'unified-namespace',
    );
    const system = entities.find(
      entity => entity.kind === 'System' && entity.metadata.name === 'integration-platform',
    );
    const oee = entities.find(
      entity => entity.kind === 'Component' && entity.metadata.name === 'example-oee-data-product',
    );
    const coldChain = entities.find(
      entity =>
        entity.kind === 'Component' &&
        entity.metadata.name === 'example-cold-chain-data-product',
    );

    expect(system).toBeDefined();
    expect(uns.spec.type).toBe('platform-component');
    expect(uns.metadata.annotations['dataprod.platform/kind']).toBe(
      'platform-component',
    );
    expect(uns.spec.system).toBe('integration-platform');
    expect(uns.spec.providesApis).toEqual(
      expect.arrayContaining([
        'unified-namespace--production-cycle',
        'unified-namespace--temperature-value',
        'unified-namespace--machine-state-event',
      ]),
    );
    expect(oee.spec.dependsOn).toContain('component:default/unified-namespace');
    expect(coldChain.spec.dependsOn).toContain(
      'component:default/unified-namespace',
    );
    expect(oee.spec.type).toBe('data-product');
  });

  it('keeps MQTT as the first transport and defers Kafka', () => {
    const compose = read('uns/docker-compose.yml');
    const transport = read('uns/app/transport.py');
    expect(compose).toContain('eclipse-mosquitto:2');
    expect(compose).toContain('UNS_MQTT_HOST');
    expect(compose).toContain('UNS_ROOT_TOPIC');
    expect(transport).toContain('class EventTransport');
    expect(transport).toContain('Kafka');
    expect(compose).not.toMatch(/kafka/i);
    expect(read('uns/app/main.py')).not.toMatch(/kafka/i);
  });

  it('does not modify certified Golden Path templates', () => {
    expect(fs.existsSync(path.join(ROOT, 'templates/mqtt-temperature-product/template.yaml'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(ROOT, 'templates/rest-equipment-product/template.yaml'))).toBe(
      true,
    );
    const mqtt = read('templates/mqtt-temperature-product/template.yaml');
    const rest = read('templates/rest-equipment-product/template.yaml');
    expect(mqtt).toContain('mqtt-temperature-data-product');
    expect(rest).toContain('rest-equipment-data-product');
    expect(mqtt).not.toContain('unified-namespace');
    expect(rest).not.toContain('unified-namespace');
  });

  it('exposes a Create template without broker internals', () => {
    const template = read('templates/unified-namespace/template.yaml');
    expect(template).toContain('title: Unified Namespace');
    expect(template).toContain('rootNamespace');
    expect(template).toContain('environment');
    expect(template).toContain('repoUrl');
    expect(template).not.toMatch(/broker type/i);
    expect(template).not.toMatch(/kafka/i);
    expect(read('templates/unified-namespace/content/.env.example')).not.toMatch(
      /password=.+/i,
    );
  });

  it('publishes Developer Hub TechDocs for UNS', () => {
    const docs = [
      'docs/platform-components.md',
      'docs/uns/index.md',
      'docs/uns/architecture.md',
      'docs/uns/namespace.md',
      'docs/uns/topic-naming.md',
      'docs/uns/event-envelope.md',
      'docs/uns/contracts.md',
      'docs/uns/mqtt-setup.md',
      'docs/uns/local-development.md',
      'docs/uns/producer-guide.md',
      'docs/uns/consumer-guide.md',
      'docs/uns/governance.md',
      'docs/uns/troubleshooting.md',
      'docs/uns/oee-example.md',
      'docs/uns/cold-chain-example.md',
    ];
    for (const relative of docs) {
      expect(fs.existsSync(path.join(ROOT, relative))).toBe(true);
    }
    expect(read('mkdocs.yml')).toContain('uns/index.md');
    expect(read('docs/platform-components/index.md')).toContain(
      '**not** a Data Product',
    );
    expect(read('docs/uns/oee-example.md')).toContain('Do not calculate OEE');
    expect(read('docs/uns/cold-chain-example.md')).toContain('No Cold Chain business logic');
  });
});
