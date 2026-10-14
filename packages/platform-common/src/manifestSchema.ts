/**
 * The JSON Schema of `nexora.yaml` (NXD-130).
 *
 * Published so that a product repository, a community publisher or a runtime
 * provider can check a manifest without running Nexora. It states the same
 * grammar `validateArtifactManifest` enforces and adds `runtime`, `interfaces`
 * and `config`; `manifestSchema.test.ts` holds the two in step.
 *
 * The registry enforces the sections NXD-130 added at registration, through
 * `validateRunnableManifestSections`; the older fields stay with the
 * hand-written validator.
 */
import schema from './nexora-manifest.schema.json';

export const NEXORA_MANIFEST_SCHEMA: Readonly<Record<string, unknown>> = schema;
