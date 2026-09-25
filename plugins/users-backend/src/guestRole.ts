/**
 * Raises the local Guest above VIEWER, when a developer asks for it.
 *
 * `app-config.guest-developer.yaml` used to claim it did this on its own, by
 * listing `auth.providers.guest.ownershipEntityRefs`. It never could. The
 * upstream guest resolver reads that list **only** as a fallback:
 *
 *     try { return await ctx.signInWithCatalogUser({ entityRef: userRef }) }
 *     catch { return ctx.issueToken({ claims: { sub: userRef, ent: ownershipRefs } }) }
 *
 * `user:default/guest` is in the catalog, so the first line always succeeds and
 * ownership comes from the catalog entity's `spec.memberOf` — never from the
 * config. Loading the file changed the merged config and nothing else, and the
 * issued token still said `platform-viewers`.
 *
 * So the elevation has to happen where ownership actually comes from: the
 * `platform_users` row the Catalog projection is written from. That also makes
 * it reach further than a token claim would. `getUserApprovalRoles` resolves
 * approval roles by reading `spec.memberOf` off the same entity, so granting a
 * `urs-*` reviewer group here makes the approval chain walkable locally in a
 * way that patching a token never would have.
 *
 * Three properties, in the order they matter.
 *
 * Refused in production. This grants roles nobody approved, to an identity
 * nobody authenticated. `auth.environment: production` is checked here rather
 * than trusted to the absence of the config key, because the key is only absent
 * until someone copies a config file.
 *
 * Opt-in. With no `users.guestGroups` configured this does nothing at all, so
 * the default install is untouched and the first-install seed stays the only
 * writer of the guest row.
 *
 * That cuts one way only, and it is worth being plain about: removing the
 * setting later does not demote a Guest it already raised. Grants live in the
 * database precisely so a restart cannot overwrite them, and an absent key
 * cannot be told apart from a role an administrator set on purpose in
 * Admin → Users & Roles. Lower it the same way it would be lowered for any
 * other account — through that screen.
 *
 * Idempotent, and quiet when it has nothing to say. Re-applying the same groups
 * writes no row and no audit record, so a restart loop does not bury the audit
 * trail — the record exists to answer "who granted this role", and a hundred
 * identical entries is not an answer.
 */

import { GUEST_USER_ENTITY_REF } from '@internal/platform-common';
import type { UsersRepository } from './repository';

/** The `platform_users.name` of the Guest identity, from its entity ref. */
export const GUEST_USER_NAME = GUEST_USER_ENTITY_REF.split('/').pop()!;

/** Recorded as the actor, alongside the seed's `system:first-install`. */
export const GUEST_ROLE_ACTOR = 'system:guest-role-override';

export type GuestGroupsResult =
  | 'NOT_CONFIGURED'
  | 'REFUSED_IN_PRODUCTION'
  | 'UNCHANGED'
  | 'APPLIED';

export interface GuestGroupOptions {
  /** `auth.environment`. Elevation is refused in production. */
  environment?: string;
  /** `users.guestGroups`. Absent or empty means "do nothing". */
  groups?: string[];
  repository: UsersRepository;
  log: (message: string) => void;
  warn: (message: string) => void;
}

function sameGroups(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export async function applyGuestGroups(
  options: GuestGroupOptions,
): Promise<GuestGroupsResult> {
  const groups = (options.groups ?? []).map(g => g.trim()).filter(Boolean);
  if (groups.length === 0) {
    return 'NOT_CONFIGURED';
  }

  if (options.environment === 'production') {
    options.warn(
      'Ignoring users.guestGroups: auth.environment is production. Guest is ' +
        'not an approved platform identity and must not be granted roles ' +
        'there. Remove the setting from the production configuration.',
    );
    return 'REFUSED_IN_PRODUCTION';
  }

  const existing = await options.repository.getUser(GUEST_USER_NAME);
  if (!existing) {
    await options.repository.createUser({
      name: GUEST_USER_NAME,
      displayName: 'Guest',
      memberOf: groups,
      actor: GUEST_ROLE_ACTOR,
    });
    await options.repository.appendAudit({
      actor: GUEST_ROLE_ACTOR,
      action: 'CREATED',
      entity: GUEST_USER_ENTITY_REF,
      newValue: { memberOf: groups },
    });
    options.log(
      `Created the local Guest user in ${groups.join(', ')} from ` +
        'users.guestGroups. Local development only.',
    );
    return 'APPLIED';
  }

  if (sameGroups(existing.memberOf, groups)) {
    return 'UNCHANGED';
  }

  await options.repository.setMemberOf(
    GUEST_USER_NAME,
    groups,
    GUEST_ROLE_ACTOR,
  );
  await options.repository.appendAudit({
    actor: GUEST_ROLE_ACTOR,
    action: 'UPDATED',
    entity: GUEST_USER_ENTITY_REF,
    oldValue: { memberOf: existing.memberOf },
    newValue: { memberOf: groups },
  });
  options.log(
    `Raised the local Guest from ${
      existing.memberOf.join(', ') || 'no group'
    } ` +
      `to ${groups.join(', ')} from users.guestGroups. Local development only.`,
  );
  return 'APPLIED';
}
