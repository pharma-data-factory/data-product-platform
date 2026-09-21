/**
 * Contract compatibility evaluation — Phase 4 (P4-S5).
 *
 * Mirrors the compatibility-policy.yaml rules; the same rules run in the
 * Python SDK and the data-products frontend plugin.
 */

import {
  compareJsonSchemas,
  evaluateContractCompatibility,
  parseSemver as parseContractSemver,
} from './contract-compatibility';

describe('parseContractSemver', () => {
  it('parses X.Y.Z', () => {
    expect(parseContractSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });
  it('parses X.Y (patch defaults to 0)', () => {
    expect(parseContractSemver('2.0')).toEqual({ major: 2, minor: 0, patch: 0 });
  });
  it('returns undefined for non-semver strings', () => {
    expect(parseContractSemver('latest')).toBeUndefined();
    expect(parseContractSemver('v1.0.0')).toBeUndefined();
  });
});

describe('compareJsonSchemas', () => {
  it('detects removed required field as breaking', () => {
    const findings = compareJsonSchemas(
      { required: ['id', 'value'], properties: { id: { type: 'string' }, value: { type: 'number' } } },
      { required: ['id'], properties: { id: { type: 'string' } } },
    );
    expect(findings.some(f => f.rule === 'removed_required_field' && f.breaking)).toBe(true);
  });

  it('detects changed field type as breaking', () => {
    const findings = compareJsonSchemas(
      { properties: { count: { type: 'integer' } } },
      { properties: { count: { type: 'string' } } },
    );
    expect(findings.some(f => f.rule === 'changed_field_type' && f.breaking)).toBe(true);
  });

  it('detects new required field as breaking', () => {
    const findings = compareJsonSchemas(
      { properties: { id: { type: 'string' } } },
      { required: ['newField'], properties: { id: { type: 'string' }, newField: { type: 'string' } } },
    );
    expect(findings.some(f => f.rule === 'new_required_field' && f.breaking)).toBe(true);
  });

  it('marks new optional field as non-breaking', () => {
    const findings = compareJsonSchemas(
      { properties: { id: { type: 'string' } } },
      { properties: { id: { type: 'string' }, extra: { type: 'boolean' } } },
    );
    const opt = findings.find(f => f.rule === 'new_optional_field');
    expect(opt).toBeDefined();
    expect(opt?.breaking).toBe(false);
  });

  it('flags major version change', () => {
    const findings = compareJsonSchemas({ version: '1.0.0' }, { version: '2.0.0' });
    expect(findings.some(f => f.rule === 'major_version_change')).toBe(true);
  });

  it('flags minor/patch as non-breaking version change', () => {
    const findings = compareJsonSchemas({ version: '1.0.0' }, { version: '1.1.0' });
    const v = findings.find(f => f.rule === 'minor_or_patch_version_change');
    expect(v).toBeDefined();
    expect(v?.breaking).toBe(false);
  });

  it('returns no findings for identical schemas', () => {
    const schema = { required: ['id'], properties: { id: { type: 'string' } } };
    expect(compareJsonSchemas(schema, schema)).toHaveLength(0);
  });
});

describe('evaluateContractCompatibility', () => {
  it('returns BREAKING_CHANGE when a required field is removed', () => {
    const report = evaluateContractCompatibility(
      { required: ['id'], properties: { id: { type: 'string' } } },
      { properties: {} },
    );
    expect(report.status).toBe('BREAKING_CHANGE');
  });

  it('returns COMPATIBLE for a new optional field', () => {
    const report = evaluateContractCompatibility(
      { properties: { id: { type: 'string' } } },
      { properties: { id: { type: 'string' }, extra: { type: 'boolean' } } },
    );
    expect(report.status).toBe('COMPATIBLE');
  });

  it('returns UNKNOWN when both schemas are empty', () => {
    const report = evaluateContractCompatibility({}, {});
    expect(report.status).toBe('UNKNOWN');
  });

  it('returns COMPATIBLE for identical schemas', () => {
    const schema = { required: ['id'], properties: { id: { type: 'string' } }, version: '1.0.0' };
    const report = evaluateContractCompatibility(schema, schema);
    expect(report.status).toBe('COMPATIBLE');
  });
});
