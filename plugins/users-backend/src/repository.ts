/**
 * Knex-backed store for platform users, their roles and the audit trail.
 */

import { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { up } from './db/migrations';

export interface PlatformUserRecord {
  name: string;
  displayName: string;
  memberOf: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
}

export interface UserAuditRecord {
  id: string;
  timestamp: Date;
  actor: string;
  action: 'CREATED' | 'UPDATED' | 'REMOVED';
  entity: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface SignInRecord {
  id: string;
  timestamp: Date;
  actor: string;
  provider: string;
}

function toRecord(row: any): PlatformUserRecord {
  return {
    name: row.name,
    displayName: row.display_name ?? row.name,
    memberOf: row.member_of ? JSON.parse(row.member_of) : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export class UsersRepository {
  private constructor(private readonly db: Knex) {}

  static async create(database: {
    getClient(): Promise<Knex> | Knex;
  }): Promise<UsersRepository> {
    const db = await database.getClient();
    await up(db);
    return new UsersRepository(db);
  }

  /** Exposed so the plugin can run the one-time seed after migrations. */
  client(): Knex {
    return this.db;
  }

  async listUsers(): Promise<PlatformUserRecord[]> {
    const rows = await this.db('platform_users').orderBy('name', 'asc').select();
    return rows.map(toRecord);
  }

  async getUser(name: string): Promise<PlatformUserRecord | undefined> {
    const row = await this.db('platform_users').where({ name }).first();
    return row ? toRecord(row) : undefined;
  }

  async createUser(user: {
    name: string;
    displayName: string;
    memberOf: string[];
    actor: string;
  }): Promise<PlatformUserRecord> {
    await this.db('platform_users').insert({
      name: user.name,
      display_name: user.displayName,
      member_of: JSON.stringify(user.memberOf),
      created_by: user.actor,
      created_at: new Date(),
    });
    return (await this.getUser(user.name))!;
  }

  async setMemberOf(
    name: string,
    memberOf: string[],
    actor: string,
  ): Promise<PlatformUserRecord> {
    await this.db('platform_users')
      .where({ name })
      .update({
        member_of: JSON.stringify(memberOf),
        updated_by: actor,
        updated_at: new Date(),
      });
    return (await this.getUser(name))!;
  }

  async deleteUser(name: string): Promise<void> {
    await this.db('platform_users').where({ name }).delete();
  }

  /**
   * Appends one audit record. There is deliberately no update or delete:
   * the trail answers "who granted this role", and deleting the account must
   * not erase the answer.
   */
  async appendAudit(
    record: Omit<UserAuditRecord, 'id' | 'timestamp'>,
  ): Promise<void> {
    await this.db('user_audit_events').insert({
      id: randomUUID(),
      timestamp: new Date(),
      actor: record.actor,
      action: record.action,
      entity: record.entity,
      old_value: record.oldValue ? JSON.stringify(record.oldValue) : null,
      new_value: record.newValue ? JSON.stringify(record.newValue) : null,
    });
  }

  async listAudit(limit = 200): Promise<UserAuditRecord[]> {
    // Ordered by id as well as timestamp: two records written in the same
    // millisecond would otherwise come back in an arbitrary order, and "in
    // what order did this happen" is the first question asked of an audit
    // trail. A real sequence column would be better still, but SQLite cannot
    // add an autoincrement column to an existing table, and the trail must
    // migrate cleanly on a database that already holds records.
    const rows = await this.db('user_audit_events')
      .orderBy([
        { column: 'timestamp', order: 'desc' },
        { column: 'id', order: 'desc' },
      ])
      .limit(limit)
      .select();
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp,
      actor: r.actor,
      action: r.action,
      entity: r.entity,
      oldValue: r.old_value ? JSON.parse(r.old_value) : undefined,
      newValue: r.new_value ? JSON.parse(r.new_value) : undefined,
    }));
  }

  async appendSignIn(actor: string, provider: string): Promise<void> {
    await this.db('user_sign_in_events').insert({
      id: randomUUID(),
      timestamp: new Date(),
      actor,
      provider,
    });
  }

  async listSignIns(limit = 200): Promise<SignInRecord[]> {
    const rows = await this.db('user_sign_in_events')
      .orderBy([
        { column: 'timestamp', order: 'desc' },
        { column: 'id', order: 'desc' },
      ])
      .limit(limit)
      .select();
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: r.timestamp,
      actor: r.actor,
      provider: r.provider,
    }));
  }
}
