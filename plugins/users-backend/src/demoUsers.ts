/**
 * Installs the named demo identities into `platform_users`. Local development
 * only.
 *
 * The same shape as `applyGuestGroups`, and for the same reason: ownership and
 * approval roles are both read off the Catalog entity, and the Catalog is a
 * projection of this table. A demo identity that is not a row here is not an
 * identity at all.
 *
 * It exists separately from `catalog/users.seed.yaml` because the seed runs
 * **once, against an empty table** — deliberately, so a restart never rewrites
 * a role an administrator changed. That is right for first-install content and
 * wrong for these: anyone with an existing dev database would never receive
 * them, which is exactly the class of "works on a fresh install only" defect
 * this batch exists to close.
 *
 * Refused in production, inert when unconfigured, idempotent and quiet when it
 * has nothing to say — the three properties `guestRole.ts` sets out, for the
 * reasons it gives there.
 *
 * ## Why more than one identity
 *
 * The URS approval chain cannot be walked alone. Each step needs its own
 * approval role, ADMIN does not bypass the check, and a QA signature is refused
 * from whoever authored the version. Granting one account every role would make
 * the demo pass and prove nothing. So the roles are split across identities the
 * demonstrator switches between, and the separation stays real.
 */

import type { UsersRepository } from './repository';

/** Recorded as the actor, alongside `system:first-install`. */
export const DEMO_USER_ACTOR = 'system:demo-identities';

export interface DemoUserSpec {
  name: string;
  displayName: string;
  memberOf: string[];
}

export type DemoUsersResult =
  | 'NOT_CONFIGURED'
  | 'REFUSED_IN_PRODUCTION'
  | 'APPLIED';

export interface DemoUsersOptions {
  /** `auth.environment`. Installing demo identities is refused in production. */
  environment?: string;
  /** `users.demoIdentities`. Absent or empty means "do nothing". */
  users?: DemoUserSpec[];
  repository: UsersRepository;
  log: (message: string) => void;
  warn: (message: string) => void;
}

function sameGroups(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

/**
 * Parses the config form into specs, dropping anything malformed.
 *
 * Dropped rather than thrown: a typo in a local demo profile should cost that
 * one identity, not the backend's ability to start.
 */
export function readDemoUsers(
  raw: unknown,
  warn: (message: string) => void,
): DemoUserSpec[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const specs: DemoUserSpec[] = [];
  for (const entry of raw) {
    const candidate = entry as Partial<DemoUserSpec>;
    const name = String(candidate?.name ?? '')
      .trim()
      .toLowerCase();
    const memberOf = Array.isArray(candidate?.memberOf)
      ? candidate.memberOf.map(g => String(g).trim()).filter(Boolean)
      : [];
    if (!name || memberOf.length === 0) {
      warn(
        `Ignoring a users.demoIdentities entry with no name or no groups: ` +
          `${JSON.stringify(entry)}`,
      );
      continue;
    }
    specs.push({
      name,
      displayName: String(candidate?.displayName ?? name),
      memberOf,
    });
  }
  return specs;
}

export async function applyDemoUsers(
  options: DemoUsersOptions,
): Promise<DemoUsersResult> {
  const users = options.users ?? [];
  if (users.length === 0) {
    return 'NOT_CONFIGURED';
  }

  if (options.environment === 'production') {
    options.warn(
      'Ignoring users.demoIdentities: auth.environment is production. These ' +
        'identities authenticate nobody and must not exist there. Remove the ' +
        'setting from the production configuration.',
    );
    return 'REFUSED_IN_PRODUCTION';
  }

  for (const user of users) {
    const existing = await options.repository.getUser(user.name);
    if (!existing) {
      await options.repository.createUser({
        name: user.name,
        displayName: user.displayName,
        memberOf: user.memberOf,
        actor: DEMO_USER_ACTOR,
      });
      await options.repository.appendAudit({
        actor: DEMO_USER_ACTOR,
        action: 'CREATED',
        entity: `user:default/${user.name}`,
        newValue: { memberOf: user.memberOf },
      });
      options.log(
        `Created demo identity ${user.name} in ${user.memberOf.join(', ')}. ` +
          'Local development only.',
      );
      continue;
    }

    if (sameGroups(existing.memberOf, user.memberOf)) {
      continue;
    }

    await options.repository.setMemberOf(
      user.name,
      user.memberOf,
      DEMO_USER_ACTOR,
    );
    await options.repository.appendAudit({
      actor: DEMO_USER_ACTOR,
      action: 'UPDATED',
      entity: `user:default/${user.name}`,
      oldValue: { memberOf: existing.memberOf },
      newValue: { memberOf: user.memberOf },
    });
    options.log(
      `Updated demo identity ${user.name} to ${user.memberOf.join(', ')}.`,
    );
  }

  return 'APPLIED';
}
