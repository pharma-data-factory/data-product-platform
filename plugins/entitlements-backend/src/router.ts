import express from 'express';
import Router from 'express-promise-router';
import { InputError, NotAllowedError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  entitlementAdminPermission,
  entitlementViewPermission,
  loadCommercialProductCatalog,
  resolvePlatformRole,
} from '@internal/platform-common';
import type { EntitlementRuntime } from './runtime';
import { redactRegistrationToken } from './awsMarketplace';
import { registrationHtml } from './registration';
import { toPublicLinkView } from './linkStore';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions: PermissionsService;
  runtime: EntitlementRuntime;
}

async function requirePermission(
  permissions: PermissionsService,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: typeof entitlementViewPermission,
) {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const [decision] = await permissions.authorize([{ permission }], {
    credentials,
  });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
  return credentials;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, httpAuth, userInfo, permissions, runtime } = options;
  const router = Router();
  router.use(express.json());
  router.use(express.urlencoded({ extended: false }));

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/entitlements', async (req, res) => {
    const credentials = await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    const info = await userInfo.getUserInfo(credentials);
    const context = await runtime.service.getEntitlements(
      runtime.config.organizationId,
    );
    logger.info(
      `Entitlement resolved for ${runtime.config.organizationId} by ${info.userEntityRef}`,
    );
    res.json({
      organizationId: context.organizationId,
      edition: runtime.config.edition,
      provider: context.provider,
      source: context.source,
      entitlements: context.entitlements,
      capabilities: context.listAvailableCapabilities(),
    });
  });

  router.get('/entitlements/:productId', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    const entitlement = await runtime.service.getEntitlement(
      runtime.config.organizationId,
      req.params.productId,
    );
    if (!entitlement) {
      res.status(404).json({ error: 'Entitlement not found' });
      return;
    }
    res.json(entitlement);
  });

  router.get('/capabilities', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    res.json({
      organizationId: runtime.config.organizationId,
      capabilities: await runtime.service.listAvailableCapabilities(
        runtime.config.organizationId,
      ),
    });
  });

  router.post('/authorize-create', async (req, res) => {
    const credentials = await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    const templateId = String(req.body?.templateId ?? '').trim();
    if (!templateId) {
      throw new InputError('templateId is required');
    }
    const info = await userInfo.getUserInfo(credentials);
    const result = await runtime.service.authorizeCreate({
      organizationId: runtime.config.organizationId,
      templateId,
      role: resolvePlatformRole(info.ownershipEntityRefs),
      actor: info.userEntityRef,
      handoff: req.body?.handoff === 'customer' ? 'customer' : 'internal',
    });
    res.status(result.allowed ? 200 : 403).json(result);
  });

  router.get('/admin/entitlements', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    const context = await runtime.service.getEntitlements(
      runtime.config.organizationId,
    );
    res.json({
      organizationId: context.organizationId,
      edition: runtime.config.edition,
      provider: context.provider,
      source: context.source,
      entitlements: context.entitlements,
      audit: runtime.service.auditTrail(),
      auditIssues: runtime.service.auditIssues(),
    });
  });

  router.get('/integration', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    const snapshot = runtime.diagnostics();
    res.json({
      provider: snapshot.provider,
      status: snapshot.status,
      environment: snapshot.environment,
      failClosed: snapshot.failClosed,
      legalDistributionStatus: snapshot.legalDistributionStatus,
      registrationEndpoint: snapshot.registrationEndpoint,
      organizationLinkCount: snapshot.organizationLinkCount,
      lastResolveCustomerCategory: snapshot.lastResolveCustomerCategory,
      region: snapshot.region,
      productCode: snapshot.productCode,
      lastSuccessfulLookup: snapshot.lastSuccessfulLookup,
      lastFailedLookup: snapshot.lastFailedLookup,
      errorCategory: snapshot.errorCategory,
      lastEntitlementLookup:
        snapshot.lastSuccessfulLookup || snapshot.lastFailedLookup,
      mappings: snapshot.mappings,
    });
  });

  router.get('/products', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    const context = await runtime.service.getEntitlements(
      runtime.config.organizationId,
    );
    const approvedLinks = runtime.linkStore.approvedForOrganization(
      runtime.config.organizationId,
    );
    const pendingLinks = runtime.linkStore
      .list()
      .filter(link => link.status === 'PENDING');
    const accessState =
      runtime.config.entitlementProvider === 'aws' &&
      approvedLinks.length === 0 &&
      pendingLinks.length > 0
        ? 'PENDING_ACCESS'
        : undefined;
    res.json({
      organizationId: context.organizationId,
      edition: runtime.config.edition,
      legalDistributionStatus: runtime.config.legalDistributionStatus,
      products: loadCommercialProductCatalog().products.map(product => {
        const entitled = context.isEntitled(product.productId);
        let cardAccess: 'ENTITLED' | 'NOT_ENTITLED' | 'PENDING_ACCESS' =
          entitled ? 'ENTITLED' : 'NOT_ENTITLED';
        if (accessState === 'PENDING_ACCESS' && !entitled) {
          cardAccess = 'PENDING_ACCESS';
        }
        return {
          ...product,
          entitled,
          accessState: cardAccess,
          entitlement: context.getEntitlement(product.productId),
        };
      }),
    });
  });

  router.post('/marketplace/register', async (req, res) => {
    const token = String(
      req.body?.['x-amzn-marketplace-token'] ??
        req.body?.registrationToken ??
        '',
    ).trim();
    if (!token) {
      throw new InputError('registration token is required');
    }
    const clientKey =
      String(req.ip || req.socket.remoteAddress || 'unknown');
    if (!runtime.rateLimiter.allow(`register:${clientKey}`)) {
      logger.warn('Marketplace registration rate limited');
      res.status(429).json({
        tenantCreated: false,
        accessGranted: false,
        requiresSignIn: true,
        status: 'RATE_LIMITED',
        entitledProductIds: [],
        message: 'Too many registration attempts. Retry later.',
      });
      return;
    }
    logger.info(
      `Marketplace registration received (${redactRegistrationToken(
        token,
      )}). Tenant provisioning is not enabled.`,
    );
    const result = await runtime.registration.register({ token });
    const payload = { ...result };
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (result.status === 'RATE_LIMITED') {
      res.status(429);
    } else if (
      result.status === 'INVALID_TOKEN' ||
      result.status === 'DENIED' ||
      result.status === 'UNAVAILABLE' ||
      result.status === 'NOT_CONFIGURED'
    ) {
      res.status(result.status === 'NOT_CONFIGURED' ? 503 : 403);
    } else {
      res.status(200);
    }
    if (wantsHtml) {
      res.type('html').send(registrationHtml(payload));
      return;
    }
    res.json(payload);
  });

  router.get('/marketplace/registrations/:id', async (req, res) => {
    const credentials = await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementViewPermission,
    );
    const info = await userInfo.getUserInfo(credentials);
    const record = runtime.registration.bindPortalUser(
      req.params.id,
      info.userEntityRef,
    );
    if (!record) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }
    res.json({
      registrationId: record.id,
      status: record.status,
      portalUser: record.portalUser,
      marketplaceIdentityBound: true,
      accessGranted: false,
      tenantCreated: false,
      message:
        'Marketplace customer identity is separate from the signed-in portal user. RBAC still applies.',
    });
  });

  router.get('/admin/marketplace-links', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    res.json({
      organizationId: runtime.config.organizationId,
      links: runtime.linkStore.publicList(),
    });
  });

  router.post('/admin/marketplace-links/:id/approve', async (req, res) => {
    const credentials = await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    const info = await userInfo.getUserInfo(credentials);
    const role = resolvePlatformRole(info.ownershipEntityRefs);
    if (role !== 'PLATFORM_ADMIN') {
      throw new NotAllowedError();
    }
    const claimed = String(req.body?.organizationId ?? '').trim();
    const result = runtime.linkStore.approve(
      req.params.id,
      claimed || runtime.config.organizationId,
      info.userEntityRef,
    );
    if (!result.ok) {
      runtime.service.recordEvent(
        'marketplace.organization.conflict',
        runtime.config.organizationId,
        info.userEntityRef,
        undefined,
        result.reason,
      );
      res.status(409).json({ error: result.reason, tenantCreated: false });
      return;
    }
    runtime.service.recordEvent(
      'marketplace.organization.linked',
      result.link.organizationId ?? runtime.config.organizationId,
      info.userEntityRef,
      undefined,
      result.link.id,
    );
    res.json({ link: toPublicLinkView(result.link), tenantCreated: false });
  });

  router.post('/admin/marketplace-links/:id/disable', async (req, res) => {
    const credentials = await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    const info = await userInfo.getUserInfo(credentials);
    const role = resolvePlatformRole(info.ownershipEntityRefs);
    if (role !== 'PLATFORM_ADMIN') {
      throw new NotAllowedError();
    }
    const link = runtime.linkStore.disable(req.params.id, info.userEntityRef);
    if (!link) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    runtime.service.recordEvent(
      'marketplace.entitlement.denied',
      runtime.config.organizationId,
      info.userEntityRef,
      undefined,
      'DISABLED',
    );
    res.json({ link: toPublicLinkView(link) });
  });

  router.post('/metering', async (req, res) => {
    await requirePermission(
      permissions,
      httpAuth,
      req,
      entitlementAdminPermission,
    );
    const result = await runtime.metering.reportUsage({
      organizationId: runtime.config.organizationId,
      dimension: String(req.body?.dimension ?? 'usage-units'),
      quantity: Number(req.body?.quantity ?? 0),
      occurredAt: new Date().toISOString(),
    });
    res.status(501).json(result);
  });

  return router;
}
