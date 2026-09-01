import express from 'express';
import Router from 'express-promise-router';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { InputError, NotAllowedError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
  RootConfigService,
  type BackstageCredentials,
} from '@backstage/backend-plugin-api';
import {
  CatalogService,
  locationSpecToMetadataName,
} from '@backstage/plugin-catalog-node';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type { Entity } from '@backstage/catalog-model';
import { platformUserManagePermission } from '@internal/platform-common';

const LOCATION_TYPE = 'file';
const LOCATION_TARGET = '../../catalog/runtime/users.yaml';

interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions: PermissionsService;
  catalog: CatalogService;
  config: RootConfigService;
}

interface AuditRecord {
  timestamp: string;
  actor: string;
  action: 'CREATED' | 'UPDATED' | 'REMOVED';
  entity: string;
  oldValue?: unknown;
  newValue?: unknown;
}

function usersFile(config: RootConfigService): string {
  const relative =
    config.getOptionalString('users.runtimeFile') ?? LOCATION_TARGET;
  return path.resolve(process.cwd(), relative);
}

function auditFile(): string {
  return path.resolve(process.cwd(), '../../catalog/runtime/users-audit.jsonl');
}

function readUsers(file: string): Entity[] {
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    const parsed = YAML.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? (parsed as Entity[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(file: string, users: Entity[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, YAML.stringify(users) || '[]\n', 'utf8');
}

function appendAudit(file: string, record: AuditRecord): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

interface SignInRecord {
  timestamp: string;
  actor: string;
  provider: string;
}

function signinFile(): string {
  return path.resolve(process.cwd(), '../../catalog/runtime/signin-audit.jsonl');
}

function appendSignIn(file: string, record: SignInRecord): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function userEntity(input: {
  login: string;
  displayName?: string;
  memberOf: string[];
}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: input.login,
      annotations: { 'github.com/user-login': input.login },
    },
    spec: {
      profile: { displayName: input.displayName || input.login },
      memberOf: input.memberOf,
    },
  };
}

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
  return {
    actor: principal.userEntityRef ?? 'unknown',
    credentials,
  };
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, permissions, catalog, config } = options;
  const router = Router();
  router.use(express.json());

  const locationRef = `location:default/${locationSpecToMetadataName({
    type: LOCATION_TYPE,
    target: LOCATION_TARGET,
  })}`;

  const refresh = async (credentials: BackstageCredentials) => {
    await catalog.refreshEntity(locationRef, { credentials });
  };

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    res.json(readUsers(usersFile(config)));
  });

  router.post('/', async (req, res) => {
    const { actor, credentials } = await authorize(permissions, httpAuth, req);
    const login = (req.body?.login ?? '').toString().trim().toLowerCase();
    if (!login || !/^[a-z0-9]([a-z0-9-]{0,62})$/.test(login)) {
      throw new InputError('A valid GitHub login is required');
    }
    const memberOf = Array.isArray(req.body?.memberOf) ? req.body.memberOf : [];
    const file = usersFile(config);
    const users = readUsers(file);
    if (users.some(u => u.metadata.name === login)) {
      throw new InputError(`User ${login} already exists`);
    }
    const entity = userEntity({
      login,
      displayName: req.body?.displayName,
      memberOf,
    });
    users.push(entity);
    writeUsers(file, users);
    appendAudit(auditFile(), {
      timestamp: new Date().toISOString(),
      actor,
      action: 'CREATED',
      entity: login,
      newValue: entity,
    });
    await refresh(credentials);
    res.status(201).json(entity);
  });

  router.put('/:name', async (req, res) => {
    const { actor, credentials } = await authorize(permissions, httpAuth, req);
    const name = req.params.name;
    const memberOf = Array.isArray(req.body?.memberOf) ? req.body.memberOf : [];
    const file = usersFile(config);
    const users = readUsers(file);
    const existing = users.find(u => u.metadata.name === name);
    if (!existing) {
      throw new InputError(`User ${name} not found`);
    }
    const updated: Entity = {
      ...existing,
      spec: { ...(existing.spec as object), memberOf },
    };
    writeUsers(
      file,
      users.map(u => (u.metadata.name === name ? updated : u)),
    );
    appendAudit(auditFile(), {
      timestamp: new Date().toISOString(),
      actor,
      action: 'UPDATED',
      entity: name,
      oldValue: existing,
      newValue: updated,
    });
    await refresh(credentials);
    res.json(updated);
  });

  router.delete('/:name', async (req, res) => {
    const { actor, credentials } = await authorize(permissions, httpAuth, req);
    const name = req.params.name;
    const file = usersFile(config);
    const users = readUsers(file);
    const existing = users.find(u => u.metadata.name === name);
    if (!existing) {
      throw new InputError(`User ${name} not found`);
    }
    writeUsers(
      file,
      users.filter(u => u.metadata.name !== name),
    );
    appendAudit(auditFile(), {
      timestamp: new Date().toISOString(),
      actor,
      action: 'REMOVED',
      entity: name,
      oldValue: existing,
    });
    await refresh(credentials);
    res.json({ removed: name });
  });

  router.get('/audit', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    const file = auditFile();
    if (!fs.existsSync(file)) {
      res.json([]);
      return;
    }
    const lines = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as AuditRecord);
    res.json(lines);
  });

  // Sign-in audit — any authenticated user records their own sign-in.
  router.post('/signins', async (req, res) => {
    const auth = await httpAuth.credentials(req, { allow: ['user'] });
    const principal = auth.principal as { userEntityRef?: string };
    const actor = principal.userEntityRef ?? 'unknown';
    const provider = String(req.body?.provider ?? 'unknown');
    appendSignIn(signinFile(), {
      timestamp: new Date().toISOString(),
      actor,
      provider,
    });
    res.status(201).json({ recorded: true });
  });

  // Sign-in audit — admin-only read.
  router.get('/signins', async (req, res) => {
    await authorize(permissions, httpAuth, req);
    const file = signinFile();
    if (!fs.existsSync(file)) {
      res.json([]);
      return;
    }
    const lines = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as SignInRecord);
    res.json(lines);
  });

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
