/**
 * Projects platform users from the database into the file the Catalog reads.
 *
 * The database is the source of truth. This file is a derived cache: it is
 * rewritten from the database at startup and after every change, and losing it
 * costs nothing because the next boot regenerates it.
 *
 * Why a projection and not a Catalog entity provider, which would be the
 * tidier answer: entity providers are registered through
 * `catalogProcessingExtensionPoint`, and an extension point may only be
 * consumed by a **module of that plugin**. A `createBackendModule({ pluginId:
 * 'catalog' })` would then receive the *catalog's* `coreServices.database`,
 * not this plugin's, so the provider and the router would read different
 * databases. Sharing one connection across that boundary needs a root-scoped
 * service, which cannot use the plugin-scoped database service either. The
 * projection avoids the whole problem and keeps the property that matters: a
 * restart never rewrites a role, because the file is written *from* the
 * database, never into it.
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { Entity } from '@backstage/catalog-model';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { PlatformUserRecord, UsersRepository } from './repository';

export function toUserEntity(user: PlatformUserRecord): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: user.name,
      annotations: { 'github.com/user-login': user.name },
    },
    spec: {
      profile: { displayName: user.displayName },
      memberOf: user.memberOf,
    },
  };
}

export class CatalogUserProjection {
  constructor(
    private readonly repository: UsersRepository,
    private readonly file: string,
    private readonly logger: LoggerService,
    private readonly refreshCatalog: () => Promise<void>,
  ) {}

  /** Rewrites the projection from the database and asks the catalog to re-read. */
  async publish(): Promise<void> {
    const users = await this.repository.listUsers();
    const content = users
      .map(user => YAML.stringify(toUserEntity(user)))
      .join('---\n');
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, content ? `${content}\n` : '', 'utf8');
    this.logger.debug(`Projected ${users.length} platform users to ${this.file}`);
    try {
      await this.refreshCatalog();
    } catch (error) {
      // A failed refresh only delays visibility to the next catalog cycle.
      // The record itself is already committed, which is the part that counts.
      this.logger.warn(
        `Catalog refresh after a user change failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
