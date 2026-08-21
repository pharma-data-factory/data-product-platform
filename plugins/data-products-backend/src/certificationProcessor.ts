import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { CatalogProcessor } from '@backstage/plugin-catalog-node';

import {
  CERTIFICATION_STATUS_ANNOTATION,
  FileCertificationOverlay,
} from './certificationOverlay';

export class CertificationOverlayProcessor implements CatalogProcessor {
  constructor(private readonly overlay: FileCertificationOverlay) {}

  getProcessorName(): string {
    return 'CertificationOverlayProcessor';
  }

  async postProcessEntity(entity: Entity): Promise<Entity> {
    if (entity.kind !== 'Component') {
      return entity;
    }
    const type = (entity.spec as { type?: string } | undefined)?.type;
    if (type !== 'data-product') {
      return entity;
    }

    const status = this.overlay.getStatus(stringifyEntityRef(entity));
    if (!status) {
      return entity;
    }

    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        annotations: {
          ...entity.metadata.annotations,
          [CERTIFICATION_STATUS_ANNOTATION]: status,
        },
      },
    };
  }
}
