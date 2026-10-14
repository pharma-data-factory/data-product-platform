/**
 * NXD-166. What the in-app "Roles & permissions" help page says, kept next to
 * the code it describes.
 *
 * The page renders the groups and permissions themselves from `roles.ts` and
 * `permissions.ts`; this file holds only the words around them. Every
 * permission named in a highlight is checked against the role's real
 * permission set (`rolesHelp.test.ts`), and the demo seats against
 * `app-config.demo.yaml` (`packages/backend/src/startup.test.ts`), so the help
 * cannot claim a right the code does not grant.
 */

import type { PlatformGroup, PlatformRole } from './roles';
import {
  ADMIN_PERMISSION_NAMES,
  BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES,
  DEVELOPER_PERMISSION_NAMES,
  OWNER_PERMISSION_NAMES,
  VIEWER_PERMISSION_NAMES,
} from './permissions';

/** The permission names a platform role holds, as the policy decides them. */
export const ROLE_PERMISSION_NAMES: Readonly<
  Record<PlatformRole, ReadonlySet<string>>
> = {
  VIEWER: VIEWER_PERMISSION_NAMES,
  DEVELOPER: DEVELOPER_PERMISSION_NAMES,
  BUSINESS_CAPABILITY_LEAD: BUSINESS_CAPABILITY_LEAD_PERMISSION_NAMES,
  DATA_PRODUCT_OWNER: OWNER_PERMISSION_NAMES,
  PLATFORM_ADMIN: ADMIN_PERMISSION_NAMES,
};

export interface RoleHighlight {
  permission: string;
  text: string;
}

export interface PlatformRoleHelp {
  role: PlatformRole;
  group: PlatformGroup;
  summary: string;
  /** What this tier adds; each permission is one the role really holds. */
  highlights: RoleHighlight[];
}

export const PLATFORM_ROLE_HELP: readonly PlatformRoleHelp[] = [
  {
    role: 'VIEWER',
    group: 'platform-viewers',
    summary: 'Reads the catalog, the marketplace, products and documentation.',
    highlights: [],
  },
  {
    role: 'DEVELOPER',
    group: 'data-product-developers',
    summary:
      'Builds: starts Golden Paths, creates data products and runs validation tests. Does not govern or approve.',
    highlights: [
      { permission: 'scaffolder.task.create', text: 'Start a Golden Path' },
      { permission: 'product.create', text: 'Create a product' },
      { permission: 'validation.run.start', text: 'Start a validation run' },
    ],
  },
  {
    role: 'BUSINESS_CAPABILITY_LEAD',
    group: 'business-capability-leads',
    summary:
      'Owns business capabilities and writes the requirements (URS) that describe them. Approves nothing.',
    highlights: [
      {
        permission: 'business-capability.manage',
        text: 'Manage business capabilities',
      },
      { permission: 'urs.create', text: 'Write a URS' },
    ],
  },
  {
    role: 'DATA_PRODUCT_OWNER',
    group: 'data-product-owners',
    summary:
      'Governs products: versions, governance fields, baselines, approval and release. Segregation of duties decides which of these acts a person may take on a given version.',
    highlights: [
      {
        permission: 'product.manage',
        text: 'Versions, governance, baselines, approve and release a version',
      },
      { permission: 'artifact.certify', text: 'Certify a registry version' },
      {
        permission: 'installation.manage',
        text: 'Install and change what runs',
      },
      {
        permission: 'urs.approve',
        text: 'Take part in URS approval (with a urs-* role)',
      },
    ],
  },
  {
    role: 'PLATFORM_ADMIN',
    group: 'platform-admins',
    summary:
      'Runs the platform: users and roles, runtime targets, signing PINs of others. Bypasses no approval or signature rule.',
    highlights: [
      {
        permission: 'platform.user.manage',
        text: 'Grant roles in Admin → Users & Roles',
      },
      {
        permission: 'installation.target.manage',
        text: 'Register runtime targets',
      },
      { permission: 'platform.admin', text: 'Administer the platform' },
    ],
  },
];

export interface DomainGroupHelp {
  group: string;
  title: string;
  /** What signing or approving this group allows. */
  acts: string;
}

/** The approval and signature roles; added to a platform role, never instead of one. */
export const DOMAIN_GROUP_HELP: readonly DomainGroupHelp[] = [
  {
    group: 'urs-authors',
    title: 'URS author',
    acts: 'Writes a requirement set, takes it through review and submits its baseline for approval.',
  },
  {
    group: 'urs-owners',
    title: 'URS owner',
    acts: 'Same rights as an author, for whoever owns a requirement set.',
  },
  {
    group: 'urs-business-reviewers',
    title: 'Business reviewer',
    acts: 'Approves step 1 of a URS baseline.',
  },
  {
    group: 'urs-product-managers',
    title: 'Product manager',
    acts: 'Approves step 2 of a URS baseline.',
  },
  {
    group: 'urs-quality-reviewers',
    title: 'Quality Assurance',
    acts: 'Applies the QA signature and approves step 3 of a URS baseline; signs a validation decision as QA.',
  },
  {
    group: 'validation-experts',
    title: 'Validation expert',
    acts: 'Starts the product evidence review and signs a validation decision as the validation expert.',
  },
];

export interface DutyRule {
  area: string;
  rule: string;
  /** The decision record or slice that introduced it, where there is one. */
  record?: string;
}

/** Segregation of duties, as the servers enforce it. */
export const SEGREGATION_OF_DUTIES: readonly DutyRule[] = [
  {
    area: 'URS',
    rule: 'Each approval step needs its own role and an administrator stands in for none; the author takes no step, and the QA signature is refused from the author.',
  },
  {
    area: 'Product version',
    rule: 'The author of a version may not approve it; the author of a product baseline may not approve that baseline.',
    record: 'P5-S2',
  },
  {
    area: 'Release',
    rule: 'Released by someone who neither wrote the version, nor approved it, nor approved its product baseline.',
    record: 'NXD-164, NXD-165',
  },
  {
    area: 'Validation decision',
    rule: 'For a GMP product the validation expert signs, then QA; whoever created the context or the product version signs neither.',
    record: 'NXD-119, NXD-121',
  },
  {
    area: 'Every signature',
    rule: 'A justification in words and the signer’s own PIN. An administrator may clear a PIN but never set one.',
    record: 'NXD-128, NXD-138, NXD-160',
  },
];

export interface SignInHelp {
  method: string;
  where: string;
  roles: string;
}

export const SIGN_IN_HELP: readonly SignInHelp[] = [
  {
    method: 'GitHub',
    where: 'Every environment, the only sign-in in production.',
    roles:
      'None on first sign-in. An administrator grants them in Admin → Users & Roles; GitHub teams follow those roles when team sync is on (NXD-107, NXD-108).',
  },
  {
    method: 'Demo seats',
    where: 'Test systems only (AUTH_DEMO_ENABLED=true); refused in production.',
    roles:
      'Fixed per seat, one approval role each, so every chain needs several people.',
  },
  {
    method: 'Guest',
    where: 'Local development only (AUTH_GUEST_ENABLED=true).',
    roles:
      'AUTH_GUEST_ROLE: viewer (default), developer, or owner. No approval role in any case.',
  },
];

export interface DemoSeatHelp {
  name: string;
  /** Groups as in app-config.demo.yaml; checked by a test. */
  memberOf: string[];
  does: string;
}

export const DEMO_SEAT_HELP: readonly DemoSeatHelp[] = [
  {
    name: 'demo-author',
    memberOf: ['data-product-owners', 'urs-authors'],
    does: 'Writes the URS and the product; creates baselines.',
  },
  {
    name: 'demo-reviewer',
    memberOf: ['data-product-owners', 'urs-business-reviewers'],
    does: 'URS step 1; can approve a product version it did not write.',
  },
  {
    name: 'demo-pm',
    memberOf: ['data-product-owners', 'urs-product-managers'],
    does: 'URS step 2; approves product baselines and versions.',
  },
  {
    name: 'demo-quality',
    memberOf: ['data-product-owners', 'urs-quality-reviewers'],
    does: 'QA signature and URS step 3.',
  },
  {
    name: 'demo-validator',
    memberOf: ['platform-viewers', 'validation-experts'],
    does: 'Starts the evidence review, signs the validation decision as expert.',
  },
  {
    name: 'demo-qa-lead',
    memberOf: ['platform-viewers', 'urs-quality-reviewers'],
    does: 'Signs the validation decision as QA (a second QA person).',
  },
  {
    name: 'demo-release',
    memberOf: ['data-product-owners'],
    does: 'Releases a product version, as the person who neither wrote nor approved it.',
  },
  {
    name: 'demo-admin',
    memberOf: ['platform-admins'],
    does: 'Runtime targets, users and roles, clearing a signing PIN. Signs nothing.',
  },
];
