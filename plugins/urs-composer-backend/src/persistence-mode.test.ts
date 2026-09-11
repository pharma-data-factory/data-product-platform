import { ConfigReader } from '@backstage/config';
import { getPersistenceMode } from './plugin';

const config = (data: object) => new ConfigReader(data);

describe('Persistence mode', () => {
  test('defaults to postgres when nothing is configured', () => {
    expect(getPersistenceMode(config({}))).toBe('postgres');
  });

  test('allows memory for local development', () => {
    expect(
      getPersistenceMode(
        config({
          auth: { environment: 'development' },
          ursComposer: { persistence: { mode: 'memory' } },
        }),
      ),
    ).toBe('memory');
  });

  test('refuses memory in a production environment', () => {
    // In-memory mode has no audit trail, no immutability triggers and no
    // transactions. Refusing to start is the correct outcome; starting and
    // silently discarding regulated records is not.
    expect(() =>
      getPersistenceMode(
        config({
          auth: { environment: 'production' },
          ursComposer: { persistence: { mode: 'memory' } },
        }),
      ),
    ).toThrow(/auth.environment is 'production'/);
  });

  test('accepts postgres in a production environment', () => {
    expect(
      getPersistenceMode(
        config({
          auth: { environment: 'production' },
          ursComposer: { persistence: { mode: 'postgres' } },
        }),
      ),
    ).toBe('postgres');
  });

  test('rejects a value that is neither', () => {
    expect(() =>
      getPersistenceMode(
        config({ ursComposer: { persistence: { mode: 'sqlite' } } }),
      ),
    ).toThrow(/Allowed values/);
  });
});
