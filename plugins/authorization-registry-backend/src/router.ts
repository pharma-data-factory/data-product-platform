import express from 'express';
import { Logger } from 'winston';
import {
  PermissionEvaluator,
  AuthorizeResult,
} from '@backstage/plugin-permission-common';
import { AuthorizationProfileRegistry } from './registry';

export interface RouterOptions {
  logger: Logger;
  registry: AuthorizationProfileRegistry;
  permissions?: PermissionEvaluator;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, registry, permissions } = options;
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/profiles', (req, res) => {
    try {
      const profiles = registry.getProfiles();
      const result = profiles.map(p => ({
        name: p.metadata.name,
        domain: p.spec.domain,
        title: p.spec.title,
        description: p.spec.description,
        permissions: p.spec.permissions.length,
        suggestedRoles: (p.spec.suggestedRoles || []).length,
      }));
      res.json(result);
    } catch (err) {
      logger.error('Error fetching profiles', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/profiles/:domain', (req, res) => {
    try {
      const profile = registry.getProfileByDomain(req.params.domain);
      if (!profile) {
        res.status(404).json({ error: `Profile not found for domain '${req.params.domain}'` });
        return;
      }
      res.json({
        name: profile.metadata.name,
        domain: profile.spec.domain,
        title: profile.spec.title,
        description: profile.spec.description,
        permissions: profile.spec.permissions,
        suggestedRoles: profile.spec.suggestedRoles,
      });
    } catch (err) {
      logger.error('Error fetching profile', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/permissions', (req, res) => {
    try {
      const allPermissions = registry.getAllPermissions();
      const result = allPermissions.map(p => ({
        name: p.name,
        title: p.title,
        description: p.description,
        category: p.category,
      }));
      res.json(result);
    } catch (err) {
      logger.error('Error fetching permissions', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/permissions/:domain', (req, res) => {
    try {
      const permissions = registry.getPermissionsByDomain(req.params.domain);
      if (permissions.length === 0 && !registry.hasProfile(req.params.domain)) {
        res.status(404).json({ error: `Domain '${req.params.domain}' not found` });
        return;
      }
      const result = permissions.map(p => ({
        name: p.name,
        title: p.title,
        description: p.description,
        category: p.category,
      }));
      res.json(result);
    } catch (err) {
      logger.error('Error fetching domain permissions', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/diagnostics', (req, res) => {
    try {
      const diagnostics = registry.getDiagnostics();
      res.json({
        profilesDiscovered: diagnostics.profilesDiscovered,
        profilesValid: diagnostics.profilesValid,
        profilesInvalid: diagnostics.profilesInvalid,
        permissionsDiscovered: diagnostics.permissionsDiscovered,
        permissionsByDomain: diagnostics.permissionsByDomain,
        domainsDiscovered: diagnostics.domainsDiscovered,
        lastLoaded: diagnostics.lastLoaded?.toISOString(),
        sourcePaths: diagnostics.sourcePaths,
        errors:
          diagnostics.errors.length > 0
            ? diagnostics.errors.map(e => ({
                profile: e.profile,
                error: e.error,
                path: e.path,
              }))
            : [],
      });
    } catch (err) {
      logger.error('Error fetching diagnostics', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/roles', (req, res) => {
    try {
      const roles = registry.getSuggestedRoles();
      const result = roles.map(r => ({
        name: r.name,
        title: r.title,
        description: r.description,
        permissions: r.permissions,
      }));
      res.json(result);
    } catch (err) {
      logger.error('Error fetching roles', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/roles/:domain', (req, res) => {
    try {
      const roles = registry.getSuggestedRolesByDomain(req.params.domain);
      if (roles.length === 0 && !registry.hasProfile(req.params.domain)) {
        res.status(404).json({ error: `Domain '${req.params.domain}' not found` });
        return;
      }
      const result = roles.map(r => ({
        name: r.name,
        title: r.title,
        description: r.description,
        permissions: r.permissions,
      }));
      res.json(result);
    } catch (err) {
      logger.error('Error fetching domain roles', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
