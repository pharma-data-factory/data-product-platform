/**
 * `nexora-manifest.schema.json` and the TypeScript model must say the same
 * thing.
 *
 * The schema restates vocabularies and grammars that live in code — kinds,
 * coordinate segments, version labels, config key types. A restatement is a
 * second copy, and two copies drift; this suite is what makes drift a failing
 * build rather than a manifest that one side accepts and the other refuses.
 *
 * Most of it reads the schema as data: enums against constants, the schema's
 * own patterns against the parsers they mirror, every `$ref` landing. The last
 * part evaluates whole manifests with ajv — the shipped catalogue, a complete
 * Data Product, and the refusals the registry's gate reports (NXD-130).
 */

import {
  ARTIFACT_COMPOSITION_USAGE_KINDS,
  ARTIFACT_HEALTH_CHECK_TYPES,
  ARTIFACT_INTERFACE_DIRECTIONS,
  ARTIFACT_INTERFACE_TYPES,
  ARTIFACT_KINDS,
  ARTIFACT_MANIFEST_API_VERSION,
  ARTIFACT_PORT_PROTOCOLS,
  ARTIFACT_RUNTIME_KINDS,
  RUNNABLE_ARTIFACT_KINDS,
  parseArtifactRef,
} from './artifact';
import { NEXORA_MANIFEST_SCHEMA } from './manifestSchema';
import { CONFIG_KEY_TYPES } from './platform-component-library';
import {
  COORDINATE_SEGMENT_MAX_LENGTH,
  DATA_CONTRACT_SCHEMA_TYPES,
  isNameSegment,
  parseVersionLabel,
} from './product';
import { DISTRIBUTION_CHANNELS } from './releases';
import { validateArtifactManifest } from './artifact';
import {
  nexoraManifestSchemaValidator,
  validateRunnableManifestSections,
} from './manifestSchemaValidator';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

type Node = Record<string, any>;
const schema = NEXORA_MANIFEST_SCHEMA as Node;
const defs = schema.$defs as Node;
const spec = defs.spec.properties as Node;
const runtime = defs.runtime.properties as Node;
const iface = defs.interface.properties as Node;

/** JSON Schema 2020-12 patterns are ECMA-262 regular expressions, unicode mode. */
const pattern = (node: Node) => new RegExp(node.pattern, 'u');

describe('nexora manifest schema — vocabularies match the code', () => {
  it.each([
    ['kind', schema.properties.kind.enum, ARTIFACT_KINDS],
    ['spec.distribution', spec.distribution.items.enum, DISTRIBUTION_CHANNELS],
    [
      'spec.usage.kind',
      spec.usage.properties.kind.enum,
      ARTIFACT_COMPOSITION_USAGE_KINDS,
    ],
    ['runtime.kind', runtime.kind.enum, ARTIFACT_RUNTIME_KINDS],
    [
      'runtime.ports[].protocol',
      runtime.ports.items.properties.protocol.enum,
      ARTIFACT_PORT_PROTOCOLS,
    ],
    [
      'runtime.health.type',
      runtime.health.properties.type.enum,
      ARTIFACT_HEALTH_CHECK_TYPES,
    ],
    ['interfaces[].type', iface.type.enum, ARTIFACT_INTERFACE_TYPES],
    [
      'interfaces[].direction',
      iface.direction.enum,
      ARTIFACT_INTERFACE_DIRECTIONS,
    ],
    [
      'interfaces[].document.type',
      iface.document.properties.type.enum,
      DATA_CONTRACT_SCHEMA_TYPES,
    ],
    ['config[].type', defs.configKey.properties.type.enum, CONFIG_KEY_TYPES],
    [
      'runnable kinds',
      schema.allOf[0].if.properties.kind.not.enum,
      RUNNABLE_ARTIFACT_KINDS,
    ],
  ])('%s', (_label, inSchema, inCode) => {
    expect(inSchema).toEqual([...inCode]);
  });

  it('pins the apiVersion the registry accepts', () => {
    expect(schema.properties.apiVersion.const).toBe(
      ARTIFACT_MANIFEST_API_VERSION,
    );
  });

  it('bounds a segment where the code does', () => {
    expect(defs.segment.maxLength).toBe(COORDINATE_SEGMENT_MAX_LENGTH);
  });
});

describe('nexora manifest schema — grammars agree with the parsers', () => {
  const segments = [
    'oee',
    'oee-line-1',
    'a',
    '0',
    'a1-b2',
    'OEE',
    'oee_line',
    '-oee',
    'oee-',
    'oee--line',
    'oee line',
    '',
    'ö',
  ];
  it.each(segments)('segment %p', value => {
    expect(pattern(defs.segment).test(value)).toBe(isNameSegment(value));
  });

  const versions = [
    '1.0',
    '1.0.0',
    '0.1',
    '10.20.30',
    '01.0',
    '1',
    '1.0.0.0',
    'v1.0',
    '1.0.0-rc.1',
    '1.0.',
    '',
  ];
  it.each(versions)('version %p', value => {
    expect(pattern(defs.version).test(value)).toBe(
      parseVersionLabel(value) !== undefined,
    );
  });

  const coordinates = [
    'nexora/oee-data-product@1.0.0',
    'acme/x@0.1',
    'nexora/oee@latest',
    'nexora/oee@^1.0',
    'nexora/oee',
    'Nexora/oee@1.0',
    'nexora/oee@1.0 ',
    'a/b/c@1.0',
  ];
  it.each(coordinates)('coordinate %p', value => {
    // parseArtifactRef trims; a manifest value with stray whitespace is still
    // wrong, so compare against the untrimmed reading.
    const parsed = value === value.trim() ? parseArtifactRef(value) : undefined;
    expect(pattern(defs.coordinate).test(value)).toBe(parsed !== undefined);
  });
});

describe('nexora manifest schema — the new fields', () => {
  it.each([
    ['ghcr.io/acme/oee-line-1', true],
    ['registry.example.com:5000/team/app', true],
    ['localhost:5000/app', true],
    ['ghcr.io/acme/oee:1.0.0', false],
    ['ghcr.io/acme/oee@sha256:abc', false],
    ['nginx', false],
    ['library/nginx', false],
    ['GHCR.io/acme/oee', false],
  ])('image repository %p → %p', (value, ok) => {
    expect(pattern(runtime.image.properties.repository).test(value)).toBe(ok);
  });

  it.each([
    ['equipment/state', true],
    ['equipment/{equipmentId}/state', true],
    ['site-a/line_1/oee.v1', true],
    ['equipment/+/state', false],
    ['equipment/#', false],
    ['/equipment/state', false],
    ['equipment//state', false],
    ['Equipment/State', false],
  ])('channel %p → %p', (value, ok) => {
    expect(pattern(iface.channel).test(value)).toBe(ok);
  });

  it.each([
    ['contracts/asyncapi.yaml', true],
    ['openapi.yaml', true],
    ['/contracts/asyncapi.yaml', false],
    ['../other/asyncapi.yaml', false],
    ['contracts/../../x.yaml', false],
  ])('document path %p → %p', (value, ok) => {
    expect(pattern(defs.relativePath).test(value)).toBe(ok);
  });

  it.each([
    ['cpu', '500m', true],
    ['cpu', '1', true],
    ['cpu', '1.5', true],
    ['cpu', '0m', false],
    ['cpu', '1 core', false],
    ['memory', '512Mi', true],
    ['memory', '2Gi', true],
    ['memory', '512m', false],
    ['memory', '512', false],
  ])('resources.limits.%s %p → %p', (field, value, ok) => {
    const limits = runtime.resources.properties.limits.properties as Node;
    expect(pattern(limits[field]).test(value)).toBe(ok);
  });

  it.each([
    ['MQTT_HOST', true],
    ['A1_B', true],
    ['mqtt_host', false],
    ['1_HOST', false],
    ['MQTT-HOST', false],
  ])('config key %p → %p', (value, ok) => {
    expect(pattern(defs.configKey.properties.key).test(value)).toBe(ok);
  });

  it('refuses a value for a secret, which would be published with the manifest', () => {
    const forbidden = Object.entries(defs.configKey.then.properties)
      .filter(([, clause]) => clause === false)
      .map(([field]) => field);
    expect(defs.configKey.if.properties.type.const).toBe('secret');
    expect(forbidden.sort()).toEqual(['defaultValue', 'example']);
  });

  it('keeps the new sections closed, so provider-specific fields cannot creep in', () => {
    for (const node of [
      defs.runtime,
      runtime.image,
      runtime.ports.items,
      runtime.health,
      runtime.resources,
      defs.interface,
      iface.document,
      defs.configKey,
    ]) {
      expect(node.additionalProperties).toBe(false);
    }
  });

  it('has no image tag or digest field: those are facts of the release', () => {
    expect(Object.keys(runtime.image.properties)).toEqual(['repository']);
  });
});

describe('nexora manifest schema — structure', () => {
  it('resolves every $ref', () => {
    const refs: string[] = [];
    const walk = (node: unknown) => {
      if (Array.isArray(node)) {
        node.forEach(walk);
      } else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          if (key === '$ref' && typeof value === 'string') refs.push(value);
          else walk(value);
        }
      }
    };
    walk(schema);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref).toMatch(/^#\/\$defs\/[A-Za-z]+$/);
      expect(defs[ref.slice('#/$defs/'.length)]).toBeDefined();
    }
  });
});

const CATALOG = join(
  __dirname,
  '..',
  '..',
  '..',
  'catalog',
  'artifacts',
  'nexora',
);
const shipped = readdirSync(CATALOG)
  .filter(file => file.endsWith('.yaml') && file !== 'publisher.yaml')
  .sort();
const load = (file: string) =>
  parseYaml(readFileSync(join(CATALOG, file), 'utf8')) as Node;

/** A complete runnable Data Product, the shape NXD-130 exists for. */
function dataProduct(): Node {
  return {
    apiVersion: ARTIFACT_MANIFEST_API_VERSION,
    kind: 'DATA_PRODUCT',
    metadata: {
      namespace: 'acme',
      name: 'oee-line-1',
      version: '1.2.0',
      license: 'Apache-2.0',
    },
    spec: {
      runtime: {
        kind: 'container',
        image: { repository: 'ghcr.io/acme/oee-line-1' },
        ports: [{ name: 'http', containerPort: 8080 }],
        health: { type: 'http', port: 'http', path: '/health' },
        resources: { limits: { cpu: '500m', memory: '512Mi' } },
      },
      interfaces: [
        {
          name: 'oee-api',
          type: 'api',
          direction: 'provides',
          port: 'http',
          contract: 'acme/oee-result@1.0.0',
          document: { type: 'OPENAPI', path: 'contracts/openapi.yaml' },
        },
        {
          name: 'machine-state',
          type: 'event',
          direction: 'consumes',
          channel: 'equipment/{equipmentId}/state',
          mechanisms: ['mqtt'],
          document: { type: 'ASYNCAPI', path: 'contracts/asyncapi.yaml' },
        },
      ],
      config: [
        {
          key: 'MQTT_HOST',
          type: 'string',
          required: true,
          example: 'mosquitto',
        },
        { key: 'MQTT_PASSWORD', type: 'secret', required: false },
      ],
    },
  };
}

describe('nexora manifest schema — whole manifests', () => {
  const validate = nexoraManifestSchemaValidator();

  it.each(shipped)('%s is valid against the schema and the validator', file => {
    const manifest = load(file);
    expect(validate.errors ?? []).toEqual([]);
    expect(validate(manifest)).toBe(true);
    expect(validateArtifactManifest(manifest)).toEqual([]);
    expect(validateRunnableManifestSections(manifest)).toEqual([]);
  });

  it('accepts a complete Data Product on all three', () => {
    const manifest = dataProduct();
    expect(validate(manifest)).toBe(true);
    expect(validateArtifactManifest(manifest)).toEqual([]);
    expect(validateRunnableManifestSections(manifest)).toEqual([]);
  });

  // Each mutation must be refused by the schema *and* by the gate the registry
  // runs. The schema alone could be right while the gate reports nothing.
  const refusals: Array<[string, (m: Node) => void, RegExp]> = [
    [
      'an image with a tag',
      m => {
        m.spec.runtime.image.repository = 'ghcr.io/acme/x:1.0';
      },
      /spec\.runtime\.image\.repository "ghcr\.io\/acme\/x:1\.0" is not valid\. Fully qualified/,
    ],
    [
      'an authored digest',
      m => {
        m.spec.runtime.image.digest = 'sha256:abc';
      },
      /spec\.runtime\.image\.digest is not a known field/,
    ],
    [
      'a Compose field',
      m => {
        m.spec.runtime.restart = 'always';
      },
      /spec\.runtime\.restart is not a known field/,
    ],
    [
      'an http health check without a path',
      m => {
        delete m.spec.runtime.health.path;
      },
      /spec\.runtime\.health\.path is required/,
    ],
    [
      'a tcp health check with a path',
      m => {
        m.spec.runtime.health.type = 'tcp';
      },
      /spec\.runtime\.health\.path is not allowed here/,
    ],
    [
      'a provided api without a port',
      m => {
        delete m.spec.interfaces[0].port;
      },
      /spec\.interfaces\[0\]\.port is required/,
    ],
    [
      'an api with a channel',
      m => {
        m.spec.interfaces[0].channel = 'x';
      },
      /spec\.interfaces\[0\]\.channel is not allowed here/,
    ],
    [
      'an api described by AsyncAPI',
      m => {
        m.spec.interfaces[0].document.type = 'ASYNCAPI';
      },
      /spec\.interfaces\[0\]\.document\.type must be OPENAPI/,
    ],
    [
      'an event without mechanisms',
      m => {
        delete m.spec.interfaces[1].mechanisms;
      },
      /spec\.interfaces\[1\]\.mechanisms is required/,
    ],
    [
      'an event described by OpenAPI',
      m => {
        m.spec.interfaces[1].document.type = 'OPENAPI';
      },
      /spec\.interfaces\[1\]\.document\.type must be one of JSON_SCHEMA, AVRO, PROTOBUF, ASYNCAPI/,
    ],
    [
      'an event with a port',
      m => {
        m.spec.interfaces[1].port = 'http';
      },
      /spec\.interfaces\[1\]\.port is not allowed here/,
    ],
    [
      'an MQTT wildcard channel',
      m => {
        m.spec.interfaces[1].channel = 'equipment/+/state';
      },
      /spec\.interfaces\[1\]\.channel "equipment\/\+\/state" is not valid/,
    ],
    [
      'a secret with a default',
      m => {
        m.spec.config[1].defaultValue = 'hunter2';
      },
      /spec\.config\[1\]\.defaultValue is not allowed here/,
    ],
    [
      'a lowercase config key',
      m => {
        m.spec.config[0].key = 'mqtt_host';
      },
      /spec\.config\[0\]\.key "mqtt_host" is not valid/,
    ],
    [
      'a contract range',
      m => {
        m.spec.interfaces[0].contract = 'acme/oee-result@^1.0';
      },
      /spec\.interfaces\[0\]\.contract "acme\/oee-result@\^1\.0" is not valid/,
    ],
    [
      'a consumed api with a port',
      m => {
        m.spec.interfaces.push({
          name: 'mes',
          type: 'api',
          direction: 'consumes',
          port: 'http',
        });
      },
      /spec\.interfaces\[2\]\.port is not allowed here/,
    ],
    [
      'a blank license',
      m => {
        m.metadata.license = ' ';
      },
      /metadata\.license " " is not valid/,
    ],
  ];

  it.each(refusals)('refuses %s', (_label, mutate, message) => {
    const manifest = dataProduct();
    mutate(manifest);
    expect(validate(manifest)).toBe(false);
    expect(validateRunnableManifestSections(manifest).join('\n')).toMatch(
      message,
    );
  });

  it('refuses runtime on a kind that does not run, without a schema engine', () => {
    const manifest = dataProduct();
    manifest.kind = 'TEMPLATE';
    expect(validate(manifest)).toBe(false);
    expect(validateArtifactManifest(manifest)).toEqual([
      'spec.runtime is only meaningful for kinds DATA_PRODUCT, CONNECTOR',
      'spec.interfaces is only meaningful for kinds DATA_PRODUCT, CONNECTOR',
      'spec.config is only meaningful for kinds DATA_PRODUCT, CONNECTOR',
    ]);
  });

  describe('rules the schema cannot state', () => {
    it('refuses a port reference to nothing', () => {
      const manifest = dataProduct();
      manifest.spec.runtime.health.port = 'metrics';
      manifest.spec.interfaces[0].port = 'grpc';
      expect(validate(manifest)).toBe(true);
      expect(validateRunnableManifestSections(manifest)).toEqual([
        'spec.runtime.health.port "metrics" names no port in spec.runtime.ports',
        'spec.interfaces[0].port "grpc" names no port in spec.runtime.ports',
      ]);
    });

    it('refuses a provided api when nothing declares ports', () => {
      const manifest = dataProduct();
      delete manifest.spec.runtime;
      expect(validateRunnableManifestSections(manifest)).toEqual([
        'spec.interfaces[0].port "http" names no port in spec.runtime.ports',
      ]);
    });

    it('refuses duplicate names and keys', () => {
      const manifest = dataProduct();
      manifest.spec.runtime.ports.push({ name: 'http', containerPort: 9090 });
      manifest.spec.interfaces[1].name = 'oee-api';
      manifest.spec.config[1].key = 'MQTT_HOST';
      expect(validate(manifest)).toBe(true);
      expect(validateRunnableManifestSections(manifest)).toEqual([
        'spec.runtime.ports: name "http" is declared more than once',
        'spec.interfaces: name "oee-api" is declared more than once',
        'spec.config: key "MQTT_HOST" is declared more than once',
      ]);
    });
  });

  it('leaves input that is not a mapping to validateArtifactManifest', () => {
    expect(validateRunnableManifestSections('nope')).toEqual([]);
    expect(validateRunnableManifestSections(null)).toEqual([]);
  });
});
