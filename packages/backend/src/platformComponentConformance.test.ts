import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import {
  CatalogEntityLike,
  isPlatformComponentEntity,
  toRelatedPlatformComponents,
} from '@internal/platform-common';

const ROOT = path.resolve(__dirname, '../../..');

const WAVE1 = [
  {
    name: 'health',
    dir: 'operations/health',
    category: 'operations',
    runtime: false,
    dependsOn: [] as string[],
  },
  {
    name: 'observability',
    dir: 'operations/observability',
    category: 'operations',
    runtime: false,
    dependsOn: [] as string[],
  },
  {
    name: 'rest-api',
    dir: 'integration/rest-api',
    category: 'integration',
    runtime: false,
    dependsOn: ['component:default/health', 'component:default/observability'],
  },
  {
    name: 'rest-source',
    dir: 'integration/rest-source',
    category: 'integration',
    runtime: false,
    dependsOn: ['component:default/observability'],
  },
  {
    name: 'mqtt-consumer',
    dir: 'integration/mqtt-consumer',
    category: 'integration',
    runtime: false,
    dependsOn: ['component:default/health', 'component:default/observability'],
  },
  {
    name: 'timeseries',
    dir: 'data/timeseries',
    category: 'data',
    runtime: false,
    dependsOn: ['component:default/observability'],
  },
] as const;

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function loadYaml(relative: string): Record<string, any> {
  return yaml.parse(read(relative));
}

function hasTests(dir: string): boolean {
  const testsDir = path.join(ROOT, 'platform-components', dir, 'tests');
  if (!fs.existsSync(testsDir)) {
    return false;
  }
  return fs.readdirSync(testsDir).some(name => name.startsWith('test_'));
}

describe('Platform Component Wave 1 conformance', () => {
  it('requires Catalog type, version, owner, docs, contract, tests, and release notes', () => {
    for (const component of WAVE1) {
      const catalog = loadYaml(
        `platform-components/${component.dir}/catalog-info.yaml`,
      );
      expect(catalog.kind).toBe('Component');
      expect(catalog.spec.type).toBe('platform-component');
      expect(catalog.spec.owner).toBe('group:default/platform-team');
      expect(catalog.metadata.annotations['dataprod.platform/kind']).toBe(
        'platform-component',
      );
      expect(catalog.metadata.annotations['dataprod.platform/version']).toBe(
        '1.0.0',
      );
      expect(catalog.metadata.annotations['dataprod.platform/category']).toBe(
        component.category,
      );
      expect(
        catalog.metadata.annotations['dataprod.platform/certification-status'],
      ).toBe('CERTIFIED');
      expect(
        catalog.metadata.annotations[
          'dataprod.platform/compatible-standard-versions'
        ],
      ).toBe('1.x');
      expect(catalog.metadata.links?.some((link: { title?: string }) => link.title === 'Documentation')).toBe(
        true,
      );
      expect(catalog.spec.dependsOn ?? []).toEqual(component.dependsOn);
      expect(
        fs.existsSync(
          path.join(ROOT, 'platform-components', component.dir, 'README.md'),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            ROOT,
            'platform-components',
            component.dir,
            'RELEASE_NOTES.md',
          ),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            ROOT,
            'platform-components',
            component.dir,
            '.env.example',
          ),
        ),
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            ROOT,
            'platform-components',
            component.dir,
            'pyproject.toml',
          ),
        ),
      ).toBe(true);
      expect(hasTests(component.dir)).toBe(true);
      const envExample = read(
        `platform-components/${component.dir}/.env.example`,
      );
      expect(envExample).not.toMatch(/sk-|ghp_|BEGIN [A-Z ]*PRIVATE KEY/);
      expect(component.runtime).toBe(false);
      expect(
        fs.existsSync(
          path.join(ROOT, 'platform-components', component.dir, 'Dockerfile'),
        ),
      ).toBe(false);
    }
  });

  it('does not force Docker onto library components and keeps secrets out of source', () => {
    const mqtt = read(
      'platform-components/integration/mqtt-consumer/src/pdf_mqtt_consumer/__init__.py',
    );
    const restSource = read(
      'platform-components/integration/rest-source/src/pdf_rest_source/__init__.py',
    );
    expect(mqtt).toContain('tls_enabled');
    expect(mqtt).not.toContain('password = "');
    expect(restSource).toContain('SOURCE_API_');
    expect(restSource).not.toContain('token = "secret');
  });

  it('registers Machine Metrics Catalog Graph dependsOn without stored Used By', () => {
    const metrics = loadYaml(
      'platform-components/examples/machine-metrics/catalog-info.yaml',
    );
    expect(metrics.spec.type).toBe('data-product');
    expect(metrics.spec.dependsOn).toEqual(
      expect.arrayContaining([
        'component:default/mqtt-consumer',
        'component:default/health',
        'component:default/observability',
        'component:default/timeseries',
        'component:default/rest-api',
      ]),
    );
    expect(metrics.metadata.links.some((link: { title?: string; url?: string }) =>
      link.title === 'Catalog Graph' &&
      String(link.url).includes('rootEntityRefs=component:default/machine-metrics-reference'),
    )).toBe(true);
    expect(metrics.metadata.annotations['dataprod.platform/used-by']).toBeUndefined();
    expect(JSON.stringify(metrics)).not.toMatch(/usedBy/i);

    const library = yaml
      .parseAllDocuments(read('platform-components/catalog.yaml'))
      .map(doc => doc.toJSON())
      .filter(Boolean) as Array<Record<string, any>>;
    const location = library.find(
      entity => entity.metadata?.name === 'platform-component-library',
    );
    const targets = location?.spec?.targets as string[] | undefined;
    expect(targets).toEqual(expect.any(Array));
    const entities = (targets ?? []).flatMap(target =>
      yaml
        .parseAllDocuments(
          read(path.join('platform-components', target.replace(/^\.\//, ''))),
        )
        .map(doc => doc.toJSON())
        .filter(Boolean),
    ) as CatalogEntityLike[];
    const related = toRelatedPlatformComponents(entities);
    expect(
      related.find(item => item.name === 'mqtt-consumer')?.usedBy,
    ).toContain('Machine Metrics Reference');
    expect(
      related.find(item => item.name === 'rest-api')?.usedBy,
    ).toContain('Machine Metrics Reference');
    expect(
      related.find(item => item.name === 'timeseries')?.usedBy,
    ).toContain('Machine Metrics Reference');
    expect(
      related.find(item => item.name === 'health')?.usedBy,
    ).toContain('Machine Metrics Reference');
    expect(
      related.find(item => item.name === 'observability')?.usedBy,
    ).toContain('Machine Metrics Reference');
    expect(entities.filter(isPlatformComponentEntity).map(entity => entity.metadata.name)).toEqual(
      expect.arrayContaining(WAVE1.map(item => item.name)),
    );
  });

  it('proves the Machine Metrics runtime composition with Docker, not OEE', () => {
    const dockerfile = read(
      'platform-components/examples/machine-metrics/Dockerfile',
    );
    expect(dockerfile).toContain('CMD ["uvicorn", "app.main:app"');
    expect(dockerfile).not.toContain('oee');
    expect(read('docs/platform-components/machine-metrics.md')).toContain(
      'cycle-time',
    );
    expect(read('docs/platform-components/machine-metrics.md')).not.toContain(
      'availability',
    );
    expect(
      read('platform-components/examples/machine-metrics/app/main.py'),
    ).toContain('Not OEE');
    expect(
      read('platform-components/examples/machine-metrics/app/main.py'),
    ).toContain('@router.get("/metrics")');
    expect(
      read('platform-components/examples/machine-metrics/app/main.py'),
    ).toContain('validate_metric(json.loads(payload))');
    expect(
      read('platform-components/examples/machine-metrics/app/main.py'),
    ).not.toMatch(/calculate_oee|availability_rate|performance_rate/i);
  });

  it('records the Wave 1 conformance matrix and OEE Definition of Ready', () => {
    const matrix = read('docs/platform-components/wave-1-conformance.md');
    for (const name of [
      'Health',
      'Observability',
      'REST API',
      'REST Source',
      'MQTT Consumer',
      'Time-Series Storage',
    ]) {
      expect(matrix).toMatch(new RegExp(`${name}.+1\\.0\\.0.+PASS.+PASS.+PASS.+PASS.+PASS.+CERTIFIED`));
    }
    expect(matrix).not.toMatch(/\| FAIL \|/);
    expect(read('docs/platform-components/oee-ready.md')).toMatch(/^READY_FOR_OEE$/m);
    expect(read('docs/platform-components/oee-ready.md')).toContain(
      'UNS_OPTIONAL_FOR_OEE_PILOT',
    );
    expect(read('docs/platform-components/oee-ready.md')).toContain(
      'AAS_OPTIONAL_FOR_OEE_PILOT',
    );
    expect(read('docs/platform-components/oee-ready.md')).toContain(
      'Do not implement OEE',
    );
    expect(read('docs/platform-components/oee-example.md')).toContain(
      'approved TESTED or CERTIFIED',
    );
    expect(read('docs/platform-components/security.md')).toContain(
      'No Vault / secret manager',
    );
  });

  it('proves Health, Observability, REST, MQTT, and Time-Series contracts', () => {
    const health = read(
      'platform-components/operations/health/src/pdf_health/models.py',
    );
    expect(health).toContain('def liveness_payload');
    expect(health).toContain('def readiness_payload');
    expect(health).toContain('HealthChecker');

    const observability = read(
      'platform-components/operations/observability/src/pdf_observability/__init__.py',
    );
    expect(observability).toContain('CORRELATION_ID_HEADER');
    expect(observability).toContain('http_request_duration_seconds');
    expect(observability).toContain('class InMemoryMetrics');
    expect(observability).toContain('def redact_fields');
    expect(observability).not.toMatch(/^\s*(import|from)\s+prometheus/m);
    expect(observability).not.toMatch(/^\s*(import|from)\s+opentelemetry/m);

    const restApi = read(
      'platform-components/integration/rest-api/src/pdf_rest_api/__init__.py',
    );
    expect(restApi).toContain('api_prefix: str = "/api/v1"');
    expect(restApi).toContain('RequestValidationError');
    expect(restApi).toContain('create_health_router');
    expect(restApi).toContain('ObservabilityMiddleware');
    expect(restApi).toContain('Domain routes are passed in');

    const restSource = read(
      'platform-components/integration/rest-source/src/pdf_rest_source/__init__.py',
    );
    expect(restSource).toContain('le=60');
    expect(restSource).toContain('le=5');
    expect(restSource).toContain('auth_header');
    expect(restSource).toContain('class RestSourceError');
    expect(restSource).toContain('No SAP/MES/customer API knowledge');

    const mqtt = read(
      'platform-components/integration/mqtt-consumer/src/pdf_mqtt_consumer/__init__.py',
    );
    expect(mqtt).toContain('reconnect_delay_set');
    expect(mqtt).toContain('reconnect_max_delay');
    expect(mqtt).toContain('tls_enabled');
    expect(mqtt).toContain('def health_check');
    expect(mqtt).not.toContain('temperature');
    expect(mqtt).not.toContain('plant/site');

    const timeseries = read(
      'platform-components/data/timeseries/src/pdf_timeseries/__init__.py',
    );
    expect(timeseries).toContain('def write_point');
    expect(timeseries).toContain('def latest');
    expect(timeseries).toContain('def query_range');
    expect(timeseries).toContain('entity_id');
    expect(timeseries).toContain('class TimeSeriesStore');
    expect(timeseries).toContain('TIMESERIES_');
  });
});
