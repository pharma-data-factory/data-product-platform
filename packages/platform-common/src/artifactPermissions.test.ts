/**
 * Artifact Registry permissions.
 *
 * Two things are checked here: that every permission the platform declares is
 * actually reachable through the package entry point, and that the registry's
 * acts are tiered so that producing, reviewing and certifying are separable
 * duties rather than one grant.
 */

import * as platformCommon from './index';
import { decidePermission } from './policy';
import {
  artifactCertifyPermission,
  artifactCreatePermission,
  artifactDeprecatePermission,
  artifactPublishPermission,
  artifactReadPermission,
  artifactReviewPermission,
  artifactSubmitPermission,
  platformPermissions,
  publisherManagePermission,
} from './permissions';

describe('the permission barrel', () => {
  it('re-exports every declared permission', () => {
    // index.ts names its exports one by one, so a permission added to
    // permissions.ts but not to that list resolves to `undefined` in every
    // consuming plugin — a router would then authorize against nothing, and
    // only a runtime read of `.name` would notice.
    const exported = new Set(
      Object.values(platformCommon)
        .filter(
          (value): value is { name: string } =>
            typeof value === 'object' &&
            value !== null &&
            typeof (value as { name?: unknown }).name === 'string',
        )
        .map(value => value.name),
    );

    const missing = platformPermissions
      .map(permission => permission.name)
      .filter(name => !exported.has(name));

    expect(missing).toEqual([]);
  });
});

describe('artifact registry permissions', () => {
  it('names each act after the act it authorizes', () => {
    expect(artifactReadPermission.name).toBe('artifact.read');
    expect(artifactCreatePermission.name).toBe('artifact.create');
    expect(artifactSubmitPermission.name).toBe('artifact.submit');
    expect(artifactReviewPermission.name).toBe('artifact.review');
    expect(artifactCertifyPermission.name).toBe('artifact.certify');
    expect(artifactPublishPermission.name).toBe('artifact.publish');
    expect(artifactDeprecatePermission.name).toBe('artifact.deprecate');
    expect(publisherManagePermission.name).toBe('publisher.manage');
  });

  it('lets viewers read the registry but produce nothing', () => {
    expect(decidePermission(artifactReadPermission, 'VIEWER')).toBe('allow');
    expect(decidePermission(artifactCreatePermission, 'VIEWER')).toBe('deny');
  });

  it('lets developers register, submit and review', () => {
    expect(decidePermission(artifactCreatePermission, 'DEVELOPER')).toBe('allow');
    expect(decidePermission(artifactSubmitPermission, 'DEVELOPER')).toBe('allow');
    expect(decidePermission(artifactReviewPermission, 'DEVELOPER')).toBe('allow');
  });

  it('withholds certification and release from the people who build', () => {
    // The producer of a version must not be able to certify and publish it on
    // their own authority; that separation is the point of the tiering.
    for (const permission of [
      artifactCertifyPermission,
      artifactPublishPermission,
      artifactDeprecatePermission,
    ]) {
      expect([permission.name, decidePermission(permission, 'DEVELOPER')]).toEqual([
        permission.name,
        'deny',
      ]);
      expect([
        permission.name,
        decidePermission(permission, 'DATA_PRODUCT_OWNER'),
      ]).toEqual([
        permission.name,
        'allow',
      ]);
    }
  });

  it('keeps namespace ownership an admin act', () => {
    // Claiming a namespace decides who is accountable for everything
    // published under it, so it sits above release authority.
    expect(decidePermission(publisherManagePermission, 'DATA_PRODUCT_OWNER')).toBe(
      'deny',
    );
    expect(decidePermission(publisherManagePermission, 'PLATFORM_ADMIN')).toBe(
      'allow',
    );
  });
});
