import { Entity } from '@backstage/catalog-model';
import {
  DataProduct,
  parseCertificationStatus,
  toRelatedDataProducts,
} from '@internal/plugin-data-products';
import { MarketplaceCatalogApi, MarketplaceCatalogTemplate } from './data';

export function marketplaceCatalogSources(entities: Entity[]): {
  products: DataProduct[];
  apis: MarketplaceCatalogApi[];
  templates: MarketplaceCatalogTemplate[];
} {
  return {
    products: toRelatedDataProducts(entities),
    apis: entities
      .filter(entity => entity.kind === 'API')
      .map(entity => ({
        name: entity.metadata.name,
        contractVersion:
          entity.metadata.annotations?.['dataprod.platform/contract-version'],
      })),
    templates: entities
      .filter(entity => entity.kind === 'Template')
      .map(entity => {
        const rawStatus =
          entity.metadata.annotations?.[
            'dataprod.platform/certification-status'
          ];
        return {
          name: entity.metadata.name,
          certificationStatus: rawStatus
            ? parseCertificationStatus(rawStatus)
            : undefined,
          templateVersion:
            entity.metadata.annotations?.['dataprod.platform/templateVersion'],
          dataProductStandardVersion:
            entity.metadata.annotations?.[
              'dataprod.platform/dataProductStandardVersion'
            ],
          dataProductSdkVersion:
            entity.metadata.annotations?.[
              'dataprod.platform/dataProductSdkVersion'
            ],
        };
      }),
  };
}
