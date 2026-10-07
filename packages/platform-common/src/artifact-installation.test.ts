/**
 * Installation configuration against a manifest's `spec.config` (NXD-139).
 */

import {
  canonicalInstallationConfig,
  computeInstallationConfigHash,
  isValidSecretRef,
  validateInstallationConfig,
} from './artifact-installation';
import type { ConfigKeySchema } from './platform-component-library';

const SCHEMA: ConfigKeySchema[] = [
  { key: 'EQUIPMENT_ID', type: 'string', required: true },
  { key: 'DEFAULT_WINDOW', type: 'string', required: true, defaultValue: 'HOUR' },
  { key: 'MQTT_PORT', type: 'number', required: false, defaultValue: '1883' },
  { key: 'MQTT_TLS', type: 'boolean', required: false },
  { key: 'SOURCE_API_URL', type: 'url', required: false },
  { key: 'MQTT_PASSWORD', type: 'secret', required: false },
];

describe('validateInstallationConfig', () => {
  it('accepts values of the declared types and stores them as strings', () => {
    const { config, issues } = validateInstallationConfig(SCHEMA, {
      EQUIPMENT_ID: 'filler-01',
      MQTT_PORT: 8883,
      MQTT_TLS: true,
      SOURCE_API_URL: 'https://mes.example.com/api',
      MQTT_PASSWORD: { secretRef: 'oee/mqtt-password' },
    });
    expect(issues).toEqual([]);
    expect(config).toEqual({
      EQUIPMENT_ID: 'filler-01',
      MQTT_PORT: '8883',
      MQTT_TLS: 'true',
      SOURCE_API_URL: 'https://mes.example.com/api',
      MQTT_PASSWORD: { secretRef: 'oee/mqtt-password' },
    });
  });

  it('refuses a literal secret value without echoing it', () => {
    const { issues } = validateInstallationConfig(SCHEMA, {
      EQUIPMENT_ID: 'filler-01',
      MQTT_PASSWORD: 'hunter2-Secret!',
    });
    expect(issues).toEqual([
      expect.stringMatching(/config\.MQTT_PASSWORD is a secret: give a reference/),
    ]);
    expect(issues.join(' ')).not.toContain('hunter2');
  });

  it('refuses a secret reference that is not a secret name, without echoing it', () => {
    const { issues } = validateInstallationConfig(SCHEMA, {
      EQUIPMENT_ID: 'filler-01',
      MQTT_PASSWORD: { secretRef: 'P@ssw0rd!' },
    });
    expect(issues).toEqual([expect.stringMatching(/secretRef is not a secret name/)]);
    expect(issues.join(' ')).not.toContain('P@ssw0rd');
  });

  it('refuses a reference for a key that is not a secret', () => {
    const { issues } = validateInstallationConfig(SCHEMA, {
      EQUIPMENT_ID: { secretRef: 'oee/equipment' },
    });
    expect(issues).toEqual([expect.stringMatching(/EQUIPMENT_ID is a string, not a secret/)]);
  });

  it('names every problem at once', () => {
    const { issues } = validateInstallationConfig(SCHEMA, {
      UNDECLARED: 'x',
      MQTT_PORT: 'eighty',
      MQTT_TLS: 'yes',
      SOURCE_API_URL: 'not a url',
    });
    expect(issues).toEqual([
      "config.UNDECLARED is not declared in the manifest's spec.config",
      'config.MQTT_PORT must be a number',
      'config.MQTT_TLS must be true or false',
      'config.SOURCE_API_URL must be a URL',
      'config.EQUIPMENT_ID is required',
    ]);
  });

  it('does not require a key the manifest gives a default for, and does not copy it', () => {
    const { config, issues } = validateInstallationConfig(SCHEMA, { EQUIPMENT_ID: 'f' });
    expect(issues).toEqual([]);
    expect(config).toEqual({ EQUIPMENT_ID: 'f' });
  });

  it('refuses anything but an object, and any key when the manifest declares none', () => {
    expect(validateInstallationConfig(SCHEMA, ['x']).issues).toEqual([
      'config must be an object of key to value',
    ]);
    expect(validateInstallationConfig(undefined, { A: 'b' }).issues).toEqual([
      "config.A is not declared in the manifest's spec.config",
    ]);
    expect(validateInstallationConfig(undefined, undefined).issues).toEqual([]);
  });
});

describe('secret references', () => {
  it('are lowercase names, not values', () => {
    expect(isValidSecretRef('oee/mqtt-password')).toBe(true);
    expect(isValidSecretRef('site.basel/oee_token')).toBe(true);
    expect(isValidSecretRef('Secret123')).toBe(false);
    expect(isValidSecretRef('a b')).toBe(false);
    expect(isValidSecretRef('/leading')).toBe(false);
    expect(isValidSecretRef('x'.repeat(254))).toBe(false);
  });
});

describe('the configuration hash', () => {
  it('does not depend on key order, and changes with any value', () => {
    const a = computeInstallationConfigHash({ B: '2', A: '1', S: { secretRef: 'x' } });
    const b = computeInstallationConfigHash({ S: { secretRef: 'x' }, A: '1', B: '2' });
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(computeInstallationConfigHash({ A: '1', B: '3', S: { secretRef: 'x' } })).not.toBe(a);
    expect(canonicalInstallationConfig({ B: '2', A: '1' })).toBe('{"A":"1","B":"2"}');
  });
});
