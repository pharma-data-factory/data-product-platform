import {
  evaluateProductUpgrade,
  evaluateVersionStatus,
  loadPlatformVersions,
} from './upgrade';

describe('upgrade status', () => {
  it('marks an equal version as CURRENT', () => {
    expect(evaluateVersionStatus('1.0.0', '1.0.0', '1.x')).toBe('CURRENT');
  });

  it('marks a compatible older version as UPDATE_AVAILABLE', () => {
    expect(evaluateVersionStatus('1.0.0', '1.1.0', '1.x')).toBe(
      'UPDATE_AVAILABLE',
    );
  });

  it('marks an incompatible older major as UPGRADE_REQUIRED', () => {
    expect(evaluateVersionStatus('1.0.0', '2.0.0', '2.x')).toBe(
      'UPGRADE_REQUIRED',
    );
  });

  it('marks a newer or invalid version as UNSUPPORTED', () => {
    expect(evaluateVersionStatus('2.0.0', '1.0.0', '1.x')).toBe('UNSUPPORTED');
    expect(evaluateVersionStatus('not-a-version', '1.0.0', '1.x')).toBe(
      'UNSUPPORTED',
    );
    expect(evaluateVersionStatus(undefined, '1.0.0', '1.x')).toBe(
      'UNSUPPORTED',
    );
  });

  it('compares a product against the current platform versions', () => {
    const platform = loadPlatformVersions();
    expect(platform.sdk).toBe('1.0.0');
    const current = evaluateProductUpgrade({
      standardVersion: '1.0.0',
      sdkVersion: '1.0.0',
      templateName: 'mqtt-temperature-data-product',
      templateVersion: '1.0.0',
    });
    expect(current.overall).toBe('CURRENT');
    expect(current.sdk.status).toBe('CURRENT');

    const update = evaluateProductUpgrade({
      standardVersion: '1.0.0',
      sdkVersion: '1.0.0',
      templateName: 'mqtt-temperature-data-product',
      templateVersion: '1.0.0',
      platform: {
        ...platform,
        sdk: '1.1.0',
      },
    });
    expect(update.sdk.status).toBe('UPDATE_AVAILABLE');
    expect(update.overall).toBe('UPDATE_AVAILABLE');
  });
});
