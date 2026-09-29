import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node';

import { FileCertificationOverlay, certificationOverlayPath } from './certificationOverlay';
import { CertificationOverlayProcessor } from './certificationProcessor';
import { ContractRelationProcessor } from './contractRelationProcessor';

export const catalogModuleCertificationOverlay = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'certification-overlay',
  register(env) {
    env.registerInit({
      deps: {
        catalogProcessing: catalogProcessingExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ catalogProcessing, config }) {
        const overlay = new FileCertificationOverlay(
          certificationOverlayPath(config),
        );
        catalogProcessing.addProcessor(
          new CertificationOverlayProcessor(overlay),
        );
        // Must reach the catalog before BuiltinKindsEntityProcessor emits
        // relations — it works in preProcessEntity for exactly that reason.
        catalogProcessing.addProcessor(new ContractRelationProcessor());
      },
    });
  },
});
