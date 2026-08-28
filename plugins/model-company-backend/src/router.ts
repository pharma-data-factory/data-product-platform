import express from 'express';
import Router from 'express-promise-router';
import { AuthenticationError, InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
import {
  HttpAuthService,
  LoggerService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult, BasicPermission } from '@backstage/plugin-permission-common';
import {
  modelCompanyControlPermission,
  modelCompanyReadPermission,
  modelCompanyRunScenarioPermission,
} from '@internal/platform-common';
import type { ModelCompanyService } from './service';
import type { ScenarioId, SimulationSpeed } from './types';

export interface RouterOptions {
  logger: LoggerService;
  httpAuth: HttpAuthService;
  permissions?: PermissionsService;
  service: ModelCompanyService;
}

async function authorize(
  permissions: PermissionsService | undefined,
  httpAuth: HttpAuthService,
  req: express.Request,
  permission: BasicPermission,
) {
  if (!permissions) {
    throw new NotAllowedError('Permission service is not configured');
  }
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const [decision] = await permissions.authorize([{ permission }], { credentials });
  if (decision.result !== AuthorizeResult.ALLOW) {
    throw new NotAllowedError();
  }
}

function respondError(res: express.Response, logger: LoggerService, error: unknown) {
  if (error instanceof AuthenticationError) {
    res.status(401).json({ error: error.message || 'Unauthorized' });
    return;
  }
  if (error instanceof NotAllowedError) {
    res.status(403).json({ error: error.message || 'Forbidden' });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof InputError) {
    res.status(400).json({ error: error.message });
    return;
  }
  logger.error(String(error));
  res.status(500).json({ error: 'Internal Server Error' });
}

const SCENARIO_IDS = new Set([
  'SCN-AI-001',
  'SCN-AI-002',
  'SCN-AI-003',
  'SCN-AI-004',
  'SCN-AI-005',
  'SCN-AI-006',
  'SCN-AI-007',
  'SCN-AI-008',
  'SCN-AI-009',
  'SCN-AI-010',
  'SCN-001',
  'SCN-002',
  'SCN-003',
  'SCN-004',
  'SCN-005',
  'SCN-006',
  'SCN-007',
  'SCN-008',
  'SCN-009',
  'SCN-010',
]);

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger, httpAuth, permissions, service } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', async (_req, res) => {
    try {
      const overview = await service.getOverview();
      res.json({
        status: 'ok',
        plugin: 'model-company',
        version: '0.1',
        classification: {
          synthetic: true,
          gxp: 'NON_GXP',
          productionUse: false,
        },
        simulation: overview.simulation,
        connectivity: overview.connectivity,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        plugin: 'model-company',
        error: String(error),
      });
    }
  });

  router.get('/public/demo', async (_req, res) => {
    try {
      const model = service.getModel();
      const overview = await service.getOverview();
      // Unauthenticated surface: connectivity.detail carries internal
      // runtime and health-probe URLs and must not leave the Control Plane.
      const { detail: _detail, ...connectivity } = overview.connectivity ?? {};
      res.json({
        overview: {
          ...overview,
          connectivity: overview.connectivity ? connectivity : undefined,
        },
        factory: {
          company: model.company,
          uns: model.uns,
          sites: model.sites,
          mqtt: model.mqtt,
          dataProducts: model.dataProducts,
          lineCount: model.lines.length,
          equipmentCount: model.equipment.length,
        },
        equipment: service.getEquipment(),
        orders: service.getOrders(),
        batches: service.getBatches(),
        genealogy: service.getGenealogy(),
        warehouse: service.getWarehouse(),
      });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/overview', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json(await service.getOverview());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/sites', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getSites() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/lines', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getLines() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/equipment', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getEquipment() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/orders', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getOrders() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/batches', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getBatches() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/genealogy', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getGenealogy() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/campaign', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json(service.getCampaign());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/serials', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getSerials() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/warehouse', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.getWarehouse() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/scenarios', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: service.listScenarios(), current: service.getState().scenarioId });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/events', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      const limit = Math.min(500, Number(req.query.limit ?? 100) || 100);
      res.json({ items: service.getEvents(limit) });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/simulation', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json(service.getState());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/factory', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      const model = service.getModel();
      res.json({
        company: model.company,
        uns: model.uns,
        sites: model.sites,
        mqtt: model.mqtt,
        dataProducts: model.dataProducts,
        lineCount: model.lines.length,
        equipmentCount: model.equipment.length,
      });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/uns/tree', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json(service.getUnsTree());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/uns/health', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json(await service.getUnsHealth());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/uns/messages', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      const limit = Math.min(500, Number(req.query.limit ?? 100) || 100);
      res.json({ items: service.getMessages(limit) });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/uns/topics', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      const topic = typeof req.query.path === 'string' ? req.query.path : undefined;
      if (topic) {
        const latest = service.getTopicLatest(topic);
        if (!latest) {
          throw new NotFoundError(`No retained/latest message for topic ${topic}`);
        }
        res.json(latest);
        return;
      }
      res.json({ items: service.getAllTopicLatest() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/data-products', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      res.json({ items: await service.getDataProductStatuses() });
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.get('/traceability/:equipmentId', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyReadPermission);
      const flow = service.getTraceability(req.params.equipmentId);
      if (!flow) {
        throw new NotFoundError(`Equipment ${req.params.equipmentId} not found`);
      }
      res.json(flow);
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/simulation/start', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyControlPermission);
      const speed = req.body?.speed as SimulationSpeed | undefined;
      if (speed !== undefined && ![1, 5, 10, 60].includes(Number(speed))) {
        throw new InputError('speed must be 1, 5, 10, or 60');
      }
      res.json(service.start(speed));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/simulation/stop', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyControlPermission);
      res.json(service.stop());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/simulation/reset', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyControlPermission);
      const seed = req.body?.seed !== undefined ? Number(req.body.seed) : 42;
      res.json(service.reset(seed));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/scenarios/run', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyRunScenarioPermission);
      const scenarioId = req.body?.scenarioId as ScenarioId;
      if (!scenarioId || !SCENARIO_IDS.has(scenarioId)) {
        throw new InputError('scenarioId must be SCN-AI-001…010 or SCN-001…010');
      }
      const seed = req.body?.seed !== undefined ? Number(req.body.seed) : undefined;
      const autoStart = req.body?.autoStart !== false;
      res.json(service.runScenario(scenarioId, seed, autoStart));
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  router.post('/simulation/tick', async (req, res) => {
    try {
      await authorize(permissions, httpAuth, req, modelCompanyControlPermission);
      res.json(service.tickOnce());
    } catch (error) {
      respondError(res, logger, error);
    }
  });

  return router;
}
