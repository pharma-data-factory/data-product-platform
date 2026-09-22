import express from 'express';
import Router from 'express-promise-router';
import { InputError, NotAllowedError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
  type BackstageCredentials,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { platformUserManagePermission } from '@internal/platform-common';
import type { PlatformUserRecord, UsersRepository } from './repository';
import { toUserEntity } from './entityProvider';
import type { CatalogUserProjection } from './entityProvider';

interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions: PermissionsService;
  repository: UsersRepository;
  projection: CatalogUserProjection;
}

/**
 * GitHub login grammar.
 *
 * Underscores and dots are allowed because GitHub Enterprise Managed Users
 * carry the organisation shortcode as `name_org` — `schmeckm_roche`. Without
 * them an EMU account cannot be given a role at all: the entity name must
 * equal the GitHub login for `usernameMatchingUserEntityName` to resolve it,
 * and this endpoint is the only supported way to create one.
 */
const LOGIN_PATTERN = /^[a-z0-9]([a-z0-9._-]{0,62})$/;

async function authorize(
  permissions: PermissionsService,
  httpAuth: HttpAuthService,
  req: express.Request,
): Promise<{ actor: string; credentials: BackstageCredentials }> {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const [decision] = await permissions.authorize(
    [{ permission: platformUserManagePermission }],
    { credentials },
  );
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  const principal = credentials.principal as { userEntityRef?: string };
  return { actor: principal.userEntityRef ?? 'unknown', credentials };
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, repository, projection } = options;
  const router = Router();
  router.use(express.json());

  // The catalog is told to re-read after every write, so a role change is
  // visible on the next request rather than at the next refresh cycle.
  const republish = () => projection.publish();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Returns Catalog entities, not rows: the admin UI reads users from the
  // catalog and this endpoint alongside it, and two shapes for one concept
  // would be a trap.
  router.get('/', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    const users = await repository.listUsers();
    res.json(users.map(toUserEntity));
  });

  router.post('/', async (req, res) => {
    const { actor } = await authorize(permissions, httpAuth, req);
    const login = (req.body?.login ?? '').toString().trim().toLowerCase();
    if (!login || !LOGIN_PATTERN.test(login)) {
      throw new InputError(
        'A valid GitHub login is required: lowercase letters or digits, then ' +
          'letters, digits, -, _ or .',
      );
    }
    if (await repository.getUser(login)) {
      throw new InputError(`User ${login} already exists`);
    }
    const memberOf = Array.isArray(req.body?.memberOf) ? req.body.memberOf : [];
    const created = await repository.createUser({
      name: login,
      displayName: (req.body?.displayName || login).toString(),
      memberOf,
      actor,
    });
    await repository.appendAudit({
      actor,
      action: 'CREATED',
      entity: login,
      newValue: { memberOf: created.memberOf },
    });
    await republish();
    res.status(201).json(toUserEntity(created));
  });

  router.put('/:name', async (req, res) => {
    const { actor } = await authorize(permissions, httpAuth, req);
    const name = req.params.name;
    const existing = await repository.getUser(name);
    if (!existing) {
      throw new InputError(`User ${name} not found`);
    }
    const memberOf = Array.isArray(req.body?.memberOf) ? req.body.memberOf : [];
    const updated = await repository.setMemberOf(name, memberOf, actor);
    // Both sides recorded: "who granted this role" is only answerable if the
    // trail says what it was before.
    await repository.appendAudit({
      actor,
      action: 'UPDATED',
      entity: name,
      oldValue: { memberOf: existing.memberOf },
      newValue: { memberOf: updated.memberOf },
    });
    await republish();
    res.json(toUserEntity(updated));
  });

  router.delete('/:name', async (req, res) => {
    const { actor } = await authorize(permissions, httpAuth, req);
    const name = req.params.name;
    const existing = await repository.getUser(name);
    if (!existing) {
      throw new InputError(`User ${name} not found`);
    }
    await repository.deleteUser(name);
    // The audit record outlives the account on purpose.
    await repository.appendAudit({
      actor,
      action: 'REMOVED',
      entity: name,
      oldValue: { memberOf: existing.memberOf },
    });
    await republish();
    res.json({ removed: name });
  });

  router.get('/audit', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    res.json(await repository.listAudit());
  });

  router.post('/signins', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const principal = credentials.principal as { userEntityRef?: string };
    const provider_ = (req.body?.provider ?? 'unknown').toString();
    await repository.appendSignIn(
      principal.userEntityRef ?? 'unknown',
      provider_,
    );
    res.status(201).json({ recorded: true });
  });

  router.get('/signins', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    res.json(await repository.listSignIns());
  });

  // Without this the default Express handler answers HTML, and a client that
  // expects JSON gets a parse error instead of a status it can act on.
  router.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error(`users-backend error: ${error.message}`);
      if (error instanceof NotAllowedError) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (error instanceof InputError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return router;
}

export type { PlatformUserRecord };
