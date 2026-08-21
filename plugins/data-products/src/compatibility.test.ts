import {
  compatibilityGateShouldFail,
  evaluateCompatibility,
  versionSatisfies,
} from './compatibility';

const BASE_SCHEMA = {
  version: '1.1.0',
  required: ['eventId', 'deviceId', 'timestamp', 'temperature', 'unit'],
  properties: {
    eventId: { type: 'string' },
    deviceId: { type: 'string' },
    timestamp: { type: 'string' },
    temperature: { type: 'number' },
    unit: { type: 'string' },
  },
};

const CONSUMER = {
  name: 'temperature-dashboard-consumer',
  consumesContract: 'temperature-event',
  compatibleVersions: ['1.x'],
  active: true,
};

describe('contract compatibility', () => {
  it('treats a compatible minor schema change as COMPATIBLE', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: {
        ...BASE_SCHEMA,
        version: '1.2.0',
        properties: {
          ...BASE_SCHEMA.properties,
          humidity: { type: 'number' },
        },
      },
      consumers: [CONSUMER],
    });
    expect(report.status).toBe('COMPATIBLE');
    expect(report.findings.some(finding => finding.rule === 'new_optional_field')).toBe(
      true,
    );
    expect(compatibilityGateShouldFail(report)).toBe(false);
  });

  it('treats a removed required property as BREAKING_CHANGE', () => {
    const { deviceId: _removed, ...nextProperties } = BASE_SCHEMA.properties;
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: {
        ...BASE_SCHEMA,
        required: BASE_SCHEMA.required.filter(field => field !== 'deviceId'),
        properties: nextProperties,
      },
      consumers: [CONSUMER],
    });
    expect(report.status).toBe('BREAKING_CHANGE');
    expect(report.blockedConsumers).toEqual(['temperature-dashboard-consumer']);
    expect(report.findings.some(finding => finding.rule === 'removed_required_field')).toBe(
      true,
    );
    expect(compatibilityGateShouldFail(report)).toBe(true);
  });

  it('treats a changed field type as BREAKING_CHANGE', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: {
        ...BASE_SCHEMA,
        properties: {
          ...BASE_SCHEMA.properties,
          temperature: { type: 'string' },
        },
      },
      consumers: [CONSUMER],
    });
    expect(report.status).toBe('BREAKING_CHANGE');
    expect(report.findings.some(finding => finding.rule === 'changed_field_type')).toBe(
      true,
    );
    expect(compatibilityGateShouldFail(report)).toBe(true);
  });

  it('treats a new optional property as COMPATIBLE', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: {
        ...BASE_SCHEMA,
        properties: {
          ...BASE_SCHEMA.properties,
          qualityFlag: { type: 'string' },
        },
      },
      consumers: [CONSUMER],
    });
    expect(report.status).toBe('COMPATIBLE');
    expect(report.findings.some(finding => finding.rule === 'new_optional_field')).toBe(
      true,
    );
    expect(compatibilityGateShouldFail(report)).toBe(false);
  });

  it('treats a new required property as BREAKING_CHANGE', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: {
        ...BASE_SCHEMA,
        required: [...BASE_SCHEMA.required, 'location'],
        properties: {
          ...BASE_SCHEMA.properties,
          location: { type: 'string' },
        },
      },
      consumers: [CONSUMER],
    });
    expect(report.status).toBe('BREAKING_CHANGE');
    expect(report.findings.some(finding => finding.rule === 'new_required_field')).toBe(
      true,
    );
    expect(compatibilityGateShouldFail(report)).toBe(true);
  });

  it('treats a major version change as breaking for a 1.x consumer', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: { ...BASE_SCHEMA, version: '2.0.0' },
      consumers: [CONSUMER],
    });
    expect(versionSatisfies('1.2.0', ['1.x'])).toBe(true);
    expect(versionSatisfies('2.0.0', ['1.x'])).toBe(false);
    expect(report.status).toBe('BREAKING_CHANGE');
    expect(compatibilityGateShouldFail(report)).toBe(true);
  });

  it('matches the shared policy fixture used by the Python SDK', () => {
    const report = evaluateCompatibility({
      contract: 'sample-event',
      previous: {
        version: '1.0.0',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      },
      next: {
        version: '2.0.0',
        required: ['id', 'site'],
        properties: {
          id: { type: 'number' },
          site: { type: 'string' },
        },
      },
      consumers: [
        {
          name: 'sample-consumer',
          consumesContract: 'sample-event',
          compatibleVersions: ['1.x'],
          active: true,
        },
      ],
    });
    expect(report.status).toBe('BREAKING_CHANGE');
    expect(report.findings.map(finding => finding.rule)).toEqual([
      'major_version_change',
      'removed_required_field',
      'changed_field_type',
      'new_required_field',
      'consumer_version_mismatch',
    ]);
    expect(report.blockedConsumers).toEqual(['sample-consumer']);
  });

  it('returns UNKNOWN when there is no active consumer', () => {
    const report = evaluateCompatibility({
      contract: 'temperature-event',
      previous: BASE_SCHEMA,
      next: BASE_SCHEMA,
      consumers: [],
    });
    expect(report.status).toBe('UNKNOWN');
    expect(compatibilityGateShouldFail(report)).toBe(false);
  });
});
