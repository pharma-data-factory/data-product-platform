import path from 'path';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { resolveFactoryPath } from './factory';
import { createRouter } from './router';
import { ModelCompanyService } from './service';
import { FileSimulationStore } from './store';

export const modelCompanyPlugin = createBackendPlugin({
  pluginId: 'model-company',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
      },
      async init({ httpRouter, logger, config, httpAuth, permissions }) {
        const factoryPath = resolveFactoryPath(
          config.getOptionalString('modelCompany.factoryPath'),
        );
        const statePath =
          config.getOptionalString('modelCompany.runtimeStorePath') ??
          path.resolve(process.cwd(), '.runtime/model-company/state.json');
        const eventsPath =
          config.getOptionalString('modelCompany.eventsPath') ??
          path.resolve(process.cwd(), '.runtime/model-company/events.jsonl');
        const runtimeBaseUrl = config.getOptionalString('modelCompany.runtimeBaseUrl');
        const brokerConfigured = Boolean(
          config.getOptionalString('modelCompany.mqtt.host') || runtimeBaseUrl,
        );
        const integrationProbes = {
          oee: config.getOptionalString('modelCompany.integrations.oeeHealthUrl'),
          equipment: config.getOptionalString(
            'modelCompany.integrations.equipmentHealthUrl',
          ),
          temperature: config.getOptionalString(
            'modelCompany.integrations.temperatureHealthUrl',
          ),
        };

        const store = new FileSimulationStore(statePath, eventsPath);
        const service = new ModelCompanyService({
          factoryPath,
          store,
          logger,
          runtimeBaseUrl,
          brokerConfigured,
          integrationProbes,
        });

        httpRouter.use(
          await createRouter({
            logger,
            httpAuth,
            permissions,
            service,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/public/demo',
          allow: 'unauthenticated',
        });

        logger.info(
          `Model Company v0.1 mounted (factory=${factoryPath}, store=${statePath})`,
        );
      },
    });
  },
});
