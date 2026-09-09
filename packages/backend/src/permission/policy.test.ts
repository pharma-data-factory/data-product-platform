import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { PolicyQueryUser } from '@backstage/plugin-permission-node';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  dataProductCertificationManagePermission,
  dataProductCreatePermission,
  entitlementAdminPermission,
  FileCreateAuthorizationAuditStore,
  goldenPathReleaseManagePermission,
  marketplaceViewPermission,
  aasReadPermission,
  aasManagePermission,
} from '@internal/platform-common';
import { PlatformPermissionPolicy } from './policy';

const policy = new PlatformPermissionPolicy();

function userWith(
  entityRef: string,
  groups: string[],
): PolicyQueryUser {
  return {
    credentials: {
      $$type: '@backstage/BackstageCredentials',
      principal: { type: 'user', userEntityRef: entityRef },
    } as PolicyQueryUser['credentials'],
    info: {
      userEntityRef: entityRef,
      ownershipEntityRefs: [entityRef, ...groups],
    },
  };
}

const viewer = userWith('user:default/viewer', [
  'group:default/platform-viewers',
]);
const developer = userWith('user:default/developer', [
  'group:default/data-product-developers',
]);
const owner = userWith('user:default/owner', [
  'group:default/data-product-owners',
]);
const admin = userWith('user:default/admin', [
  'group:default/platform-admins',
]);
const guest = userWith('user:default/guest', [
  'group:default/guests',
  'group:default/platform-admins',
]);
const unknownGithubUser = userWith('user:default/new-github-user', []);
const ursQa = userWith('user:default/urs-qa', [
  'group:default/platform-viewers',
  'group:default/urs-quality-reviewers',
]);
const ursAuthor = userWith('user:default/urs-author', [
  'group:default/platform-viewers',
  'group:default/urs-authors',
]);

describe('PlatformPermissionPolicy', () => {
  it('denies unauthenticated access', async () => {
    await expect(
      policy.handle({
        permission: {
          name: 'catalog.entity.read',
          attributes: { action: 'read' },
          type: 'basic',
        },
      }),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle({
        permission: {
          name: 'techdocs.entity.read',
          attributes: { action: 'read' },
          type: 'basic',
        },
      }),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('allows Viewer catalog, marketplace, and data product reads', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'catalog.entity.read',
            attributes: { action: 'read' },
            type: 'basic',
          },
        },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: marketplaceViewPermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: aasReadPermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: aasManagePermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'techdocs.entity.read',
            attributes: { action: 'read' },
            type: 'basic',
          },
        },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('denies unauthorized Scaffolder use for Viewer', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.task.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.action.execute',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle({ permission: dataProductCreatePermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle(
        { permission: dataProductCertificationManagePermission },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle({ permission: entitlementAdminPermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('allows Developer Scaffolder use', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.task.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        developer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.action.execute',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        developer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: dataProductCreatePermission }, developer),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        { permission: dataProductCertificationManagePermission },
        developer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle({ permission: goldenPathReleaseManagePermission }, developer),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('allows Owner certification workflow and AAS administration', async () => {
    await expect(
      policy.handle(
        { permission: dataProductCertificationManagePermission },
        owner,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: aasManagePermission }, owner),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('allows Admin platform administration', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.template.management',
            attributes: {},
            type: 'basic',
          },
        },
        admin,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle({ permission: goldenPathReleaseManagePermission }, admin),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('does not grant Viewer implicitly to unknown GitHub users', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'catalog.entity.read',
            attributes: { action: 'read' },
            type: 'basic',
          },
        },
        unknownGithubUser,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'techdocs.entity.read',
            attributes: { action: 'read' },
            type: 'basic',
          },
        },
        unknownGithubUser,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.task.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        unknownGithubUser,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('allows seeded URS quality reviewers to approve and sign', async () => {
    const qa = userWith('user:default/urs-qa', [
      'group:default/platform-viewers',
      'group:default/urs-quality-reviewers',
    ]);
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.approve',
            attributes: { action: 'update' },
            type: 'basic',
          },
        },
        qa,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.sign',
            attributes: { action: 'update' },
            type: 'basic',
          },
        },
        qa,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        qa,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('allows seeded URS authors to create and manage drafts', async () => {
    const author = userWith('user:default/urs-author', [
      'group:default/platform-viewers',
      'group:default/urs-authors',
    ]);
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        author,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.manage',
            attributes: { action: 'update' },
            type: 'basic',
          },
        },
        author,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'urs.approve',
            attributes: { action: 'update' },
            type: 'basic',
          },
        },
        author,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });

  it('keeps Guest as a development fallback with local Golden Path access', async () => {
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.task.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        guest,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('keeps RBAC independent of entitlements and ANDs commercial create separately', () => {
    const src = fs.readFileSync(path.join(__dirname, 'policy.ts'), 'utf8');
    expect(src).toContain('decidePermission');
    expect(src).toContain('resolvePlatformRole');
    expect(src).toContain('hasEntitlement');
    expect(src).toContain('auditStore');
    expect(src).toContain('isGenerallyAvailableRelease');
    expect(fs.readFileSync(path.join(__dirname, 'module.ts'), 'utf8')).toContain(
      'createAuthorizationAuditStore',
    );
    expect(src).toContain('commercialProductForTemplate');
    expect(src).not.toContain('createDefaultOrganizationContext');
  });

  it('denies commercial Golden Path create when entitlement is missing', async () => {
    const gated = new PlatformPermissionPolicy({
      organizationId: 'internal',
      hasEntitlement: async (_organizationId, productId) =>
        productId !== 'golden-path.mqtt-temperature',
    });
    await expect(
      gated.handle(
        {
          permission: {
            name: 'scaffolder.template.parameter.read',
            attributes: { action: 'read' },
            type: 'resource',
            resourceType: 'scaffolder-template',
          },
          resourceRef: 'template:default/mqtt-temperature-data-product',
        } as never,
        developer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
    await expect(
      gated.handle(
        {
          permission: {
            name: 'scaffolder.template.parameter.read',
            attributes: { action: 'read' },
            type: 'resource',
            resourceType: 'scaffolder-template',
          },
          resourceRef: 'template:default/python-microservice',
        } as never,
        developer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('records the Scaffolder Create policy decision on the durable store', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-create-audit-'));
    const filePath = path.join(dir, 'create-authorization-audit.jsonl');
    const store = new FileCreateAuthorizationAuditStore(filePath);
    const audited = new PlatformPermissionPolicy({
      organizationId: 'internal',
      hasEntitlement: async () => true,
      auditStore: store,
    });

    await audited.handle(
      {
        permission: {
          name: 'scaffolder.task.create',
          attributes: { action: 'create' },
          type: 'basic',
        },
      },
      viewer,
    );
    await audited.handle(
      {
        permission: {
          name: 'scaffolder.task.create',
          attributes: { action: 'create' },
          type: 'basic',
        },
      },
      developer,
    );
    await audited.handle(
      {
        permission: {
          name: 'catalog.entity.read',
          attributes: { action: 'read' },
          type: 'basic',
        },
      },
      viewer,
    );

    const restarted = new FileCreateAuthorizationAuditStore(filePath);
    const retained = restarted.list();
    expect(retained).toHaveLength(2);
    expect(retained[0]).toMatchObject({
      actor: 'user:default/viewer',
      action: 'scaffolder.task.create',
      decision: 'DENY',
      authorizationContext: { reason: 'RBAC', permission: 'scaffolder.task.create' },
    });
    expect(retained[1]).toMatchObject({
      actor: 'user:default/developer',
      action: 'scaffolder.task.create',
      decision: 'GRANT',
      authorizationContext: { reason: 'OK', permission: 'scaffolder.task.create' },
    });
    expect(retained[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
