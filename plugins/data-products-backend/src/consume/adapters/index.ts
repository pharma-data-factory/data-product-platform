import type { Entity } from '@backstage/catalog-model';
import { equipmentAdapter } from './equipment';
import { genericAdapter } from './generic';
import { oeeAdapter } from './oee';
import { temperatureAdapter } from './temperature';
import {
  productNameOf,
  templateOf,
  type EnvelopeAdapter,
} from './types';

export type {
  ConsumeQueryContext,
  EnvelopeAdapter,
} from './types';
export { isEnvelopeBody } from './types';

/**
 * Resolve the Envelope adapter for a Catalog data-product entity.
 * Matching is by template annotation first, then product name heuristics.
 */
export function resolveEnvelopeAdapter(entity: Entity): EnvelopeAdapter {
  const template = templateOf(entity);
  const name = productNameOf(entity);

  if (
    template.includes('mqtt-temperature') ||
    template.includes('temperature') ||
    name.includes('temperature') ||
    name.includes('mqtt-temperature')
  ) {
    return temperatureAdapter;
  }
  if (
    template.includes('rest-equipment') ||
    template.includes('equipment') ||
    name.includes('equipment')
  ) {
    return equipmentAdapter;
  }
  if (template.includes('oee') || name.includes('oee')) {
    return oeeAdapter;
  }
  return genericAdapter;
}

export {
  equipmentAdapter,
  genericAdapter,
  oeeAdapter,
  temperatureAdapter,
};
