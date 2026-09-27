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

  test('refuses memory while permissions are enabled', () => {
    // NXD-064 C-1, the half that does not depend on remembering to set
    // auth.environment. Deciding who may approve, sign or release is only
    // meaningful if the record of the decision survives; enforcing it against
    // a store that loses everything on restart produces authorization nobody
    // can later evidence.
    expect(() =>
      getPersistenceMode(
        config({
          auth: { environment: 'development' },
          permission: { enabled: true },
          ursComposer: { persistence: { mode: 'memory' } },
        }),
      ),
    ).toThrow(/permission.enabled is true/);
  });

  test('allows memory when permissions are explicitly off', () => {
    // What app-config.memory.yaml does, and the reason it has to: opting out
    // of the durable store means opting out of enforcing governance on it.
    expect(
      getPersistenceMode(
        config({
          auth: { environment: 'development' },
          permission: { enabled: false },
          ursComposer: { persistence: { mode: 'memory' } },
        }),
      ),
    ).toBe('memory');
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
