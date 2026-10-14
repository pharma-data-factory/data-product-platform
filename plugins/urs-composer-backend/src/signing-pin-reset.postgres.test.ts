/**
 * The administrator PIN reset against real PostgreSQL (NXD-138).
 *
 * Pinned on the database rather than the in-memory store, because that is
 * where the guarantees live: the reset and its audit event commit together,
 * the event is append-only (the URS_APPEND_ONLY trigger), and a reset whose
 * audit write fails leaves the credential where it was.
 *
 * Requires the test database; see p1a-verification.test.ts for the connection
 * defaults.
 */

import { Knex } from 'knex';
import { LoggerService } from '@backstage/backend-plugin-api';
import { PostgresURSRepository } from './postgres-repository';
import { URSService } from './service';
import { MAX_FAILED_ATTEMPTS } from './domain/reauth';
import { createTestDatabase, TestDatabase } from './__testUtils__/testDatabase';
import { describeWhenPg } from './__testUtils__/describeWhenAvailable';

const mockLogger: LoggerService = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): LoggerService => mockLogger),
};

const ADMIN = 'user:default/demo-admin';

let counter = 0;
function nextSeat(): string {
  counter += 1;
  return `user:default/pin-reset-seat-${counter}`;
}

describeWhenPg('Signing PIN reset on PostgreSQL (NXD-138)', () => {
  let testDb: TestDatabase;
  let db: Knex;
  let repository: PostgresURSRepository;
  let service: URSService;

  beforeAll(async () => {
    testDb = await createTestDatabase('signing-pin-reset');
    db = testDb.db;
    repository = new PostgresURSRepository(db);
    service = new URSService({ logger: mockLogger, repository } as never);
  }, 60000);

  afterAll(async () => {
    await testDb.dispose();
  }, 60000);

  async function lockedSeat(): Promise<string> {
    const seat = nextSeat();
    await service.setSigningPin(seat, 'first-pin-1');
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await expect(service.verifySigningPin(seat, 'wrong-pin-0')).rejects.toThrow();
    }
    return seat;
  }

  test('clears the row with its lockout and records an append-only PIN_RESET', async () => {
    const seat = await lockedSeat();
    const locked = await db('signature_credentials').where({ user_ref: seat }).first();
    expect(locked.locked_until).not.toBeNull();

    await service.resetSigningPin(ADMIN, seat, 'Locked out, ticket 4711');

    expect(
      await db('signature_credentials').where({ user_ref: seat }).first(),
    ).toBeUndefined();

    const rows = await db('audit_events').where({
      entity_type: 'SIGNATURE_CREDENTIAL',
      entity_id: seat,
      event_type: 'PIN_RESET',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].actor).toBe(ADMIN);
    expect(JSON.stringify(rows[0].new_value)).toContain('Locked out, ticket 4711');

    await expect(
      db('audit_events').where({ id: rows[0].id }).update({ actor: 'nobody' }),
    ).rejects.toThrow(/URS_APPEND_ONLY/);
    await expect(
      db('audit_events').where({ id: rows[0].id }).del(),
    ).rejects.toThrow(/URS_APPEND_ONLY/);

    // Enrols again as a first enrolment, and signs with the new PIN.
    await service.setSigningPin(seat, 'fresh-pin-2');
    await expect(service.verifySigningPin(seat, 'fresh-pin-2')).resolves.toBe(
      'signature-pin',
    );
  });

  test('a failed audit write rolls the reset back', async () => {
    const seat = await lockedSeat();
    const failing = new PostgresURSRepository(db);
    const original = failing.withTransaction.bind(failing);
    failing.withTransaction = (fn =>
      original(async repo => {
        repo.createAuditEvent = async () => {
          throw new Error('audit store unavailable');
        };
        return fn(repo);
      })) as typeof failing.withTransaction;
    const failingService = new URSService({
      logger: mockLogger,
      repository: failing,
    } as never);

    await expect(
      failingService.resetSigningPin(ADMIN, seat, 'Locked out'),
    ).rejects.toThrow('audit store unavailable');

    const row = await db('signature_credentials').where({ user_ref: seat }).first();
    expect(row).toBeDefined();
    expect(row.locked_until).not.toBeNull();
  });
});
