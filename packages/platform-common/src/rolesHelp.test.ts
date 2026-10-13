/**
 * NXD-166. The roles help page may not claim what the code does not do.
 */

import {
  DOMAIN_GROUP_HELP,
  PLATFORM_ROLE_HELP,
  ROLE_PERMISSION_NAMES,
} from './rolesHelp';
import {
  GROUP_TO_ROLE,
  PLATFORM_ROLES,
  URS_DOMAIN_GROUPS,
  VALIDATION_EXPERT_GROUP,
} from './roles';

describe('roles help (NXD-166)', () => {
  it('describes every platform role once, in rank order, with its real group', () => {
    expect(PLATFORM_ROLE_HELP.map(h => h.role)).toEqual([...PLATFORM_ROLES]);
    for (const help of PLATFORM_ROLE_HELP) {
      expect(GROUP_TO_ROLE[help.group]).toBe(help.role);
    }
  });

  it('names only permissions the role really holds', () => {
    for (const help of PLATFORM_ROLE_HELP) {
      for (const { permission } of help.highlights) {
        expect([
          help.role,
          ROLE_PERMISSION_NAMES[help.role].has(permission),
        ]).toEqual([help.role, true]);
      }
    }
  });

  it('says a developer does not approve, and only the owner tier manages products', () => {
    expect(ROLE_PERMISSION_NAMES.DEVELOPER.has('product.manage')).toBe(false);
    expect(ROLE_PERMISSION_NAMES.DEVELOPER.has('urs.approve')).toBe(false);
    expect(
      ROLE_PERMISSION_NAMES.BUSINESS_CAPABILITY_LEAD.has('urs.approve'),
    ).toBe(false);
    expect(ROLE_PERMISSION_NAMES.DATA_PRODUCT_OWNER.has('product.manage')).toBe(
      true,
    );
  });

  it('covers every approval and signature group', () => {
    expect(DOMAIN_GROUP_HELP.map(h => h.group).sort()).toEqual(
      [...URS_DOMAIN_GROUPS, VALIDATION_EXPERT_GROUP].sort(),
    );
  });
});
