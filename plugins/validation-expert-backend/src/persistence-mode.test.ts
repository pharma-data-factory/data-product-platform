import { ConfigReader } from '@backstage/config';
import { getPersistenceMode } from './plugin';

const config = (data: object) => new ConfigReader(data);

describe('Validation Expert persistence mode (NXD-090)', () => {
  test('falls back to file for local development', () => {
    expect(getPersistenceMode(config({}))).toBe('file');
    expect(
      getPersistenceMode(config({ auth: { environment: 'development' } })),
    ).toBe('file');
  });

  test('accepts postgres in production', () => {
    expect(
      getPersistenceMode(
        config({
          auth: { environment: 'production' },
          validationExpert: { persistence: { mode: 'postgres' } },
        }),
      ),
    ).toBe('postgres');
  });

  test('refuses an explicit file store in production', () => {
    expect(() =>
      getPersistenceMode(
        config({
          auth: { environment: 'production' },
          validationExpert: { persistence: { mode: 'file' } },
        }),
      ),
    ).toThrow(/'file' while auth.environment is 'production'/);
  });

  test('refuses the implicit file default in production', () => {
    // The case that actually shipped: production never mentioned the key, so
    // the fallback applied and the evidence lived in the container.
    expect(() =>
      getPersistenceMode(config({ auth: { environment: 'production' } })),
    ).toThrow(/'file' \(the default\) while auth.environment/);
  });

  test('refuses memory in production', () => {
    expect(() =>
      getPersistenceMode(
        config({
          auth: { environment: 'production' },
          validationExpert: { persistence: { mode: 'memory' } },
        }),
      ),
    ).toThrow(/'memory' while auth.environment is 'production'/);
  });

  test('still rejects unknown modes', () => {
    expect(() =>
      getPersistenceMode(
        config({ validationExpert: { persistence: { mode: 'sqlite' } } }),
      ),
    ).toThrow(/Invalid validationExpert.persistence.mode: 'sqlite'/);
  });
});
