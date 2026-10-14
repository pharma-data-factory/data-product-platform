import { installConfigFromForm, signatureReason } from './install';

const SCHEMA = [
  { key: 'EQUIPMENT_ID', type: 'string' as const, required: true },
  { key: 'MQTT_PORT', type: 'number' as const, required: false, defaultValue: '1883' },
  { key: 'MQTT_PASSWORD', type: 'secret' as const, required: false },
];

describe('installConfigFromForm (NXD-141)', () => {
  it('leaves empty fields unset and sends a secret as a reference', () => {
    expect(
      installConfigFromForm(SCHEMA, {
        EQUIPMENT_ID: ' filler-01 ',
        MQTT_PORT: '',
        MQTT_PASSWORD: 'line3/mqtt',
      }),
    ).toEqual({
      config: { EQUIPMENT_ID: 'filler-01', MQTT_PASSWORD: { secretRef: 'line3/mqtt' } },
      issues: [],
    });
  });

  it('names every problem before anyone signs, without echoing a secret', () => {
    const { issues } = installConfigFromForm(SCHEMA, {
      MQTT_PORT: 'eighteen',
      MQTT_PASSWORD: 'Hunter2!',
    });
    expect(issues).toEqual([
      'config.MQTT_PORT must be a number',
      expect.stringContaining('config.MQTT_PASSWORD.secretRef is not a secret name'),
      'config.EQUIPMENT_ID is required',
    ]);
    expect(issues.join(' ')).not.toContain('Hunter2');
  });
});

describe('signatureReason', () => {
  it('says why each source is signed', () => {
    expect(signatureReason('PRODUCT')).toMatch(/governs it is GMP-relevant/);
    expect(signatureReason('NO_PRODUCT')).toMatch(/No Nexora product governs it/);
    expect(signatureReason('UNAVAILABLE')).toMatch(/could not be read/);
  });
});
