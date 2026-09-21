import { Entity } from '@backstage/catalog-model';
import {
  DataProduct,
  parseCertificationStatus,
  toRelatedDataProducts,
} from '@internal/plugin-data-products';
import { MarketplaceCatalogApi, MarketplaceCatalogTemplate } from './data';

/**
 * A count is only worth showing when it is a count. An annotation carrying
 * anything else is dropped rather than rendered as NaN, which would read as a
 * defect in the requirements rather than in the annotation.
 */
function parseRequirementCount(raw?: string): number | undefined {
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

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
          // What the path is held to. A template that declares no requirement
          // set is not an error — most do not yet — so both fields stay
          // optional and the view says "not declared" rather than nothing.
          ursSatisfies:
            entity.metadata.annotations?.['dataprod.platform/urs-satisfies'],
          ursRequirementCount: parseRequirementCount(
            entity.metadata.annotations?.[
              'dataprod.platform/urs-requirement-count'
            ],
          ),
        };
      }),
  };
}
