export { ursComposerPlugin as default } from './plugin';

/**
 * Supported integration surface.
 *
 * The URS → Validation Expert entry gate is proved by a suite that lives in
 * `validation-expert-backend` and drives a real URS service against a real
 * schema. It used to reach into this package's private source
 * (`@internal/plugin-urs-composer-backend/src/...`), which the platform
 * guardrails flag as a cross-plugin boundary break. What that suite needs is
 * published here instead, so the coupling is a declared API rather than a
 * path into someone else's `src/`.
 */
export { URSService } from './service';
export type { URSServiceOptions } from './service';
export { PostgresURSRepository } from './postgres-repository';
export { SignaturePinReAuth } from './domain/reauth';
export { SolutionType } from './types';

/**
 * How the URS schema is built. Exported for suites that need a real database;
 * the plugin itself migrates through its own startup path.
 */
export {
  up as applyUrsMigrations,
  down as revertUrsMigrations,
} from './db/migrations';
export { seed as seedUrsDatabase } from './db/seeds';
