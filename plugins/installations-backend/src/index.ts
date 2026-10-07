/**
 * Installations backend (NXD-129, NXD-139).
 *
 * The store of governed desired state for released artifacts on runtime
 * targets. Every route is gated by one of the `installation.*` permissions
 * declared in platform-common.
 */

export { installationsPlugin as default } from './plugin';
export { createRouter } from './router';
export type { RouterOptions } from './router';
export { InstallationsRepository } from './repository';
export type { InstallationAuditEvent } from './repository';
export { InstallationsService } from './service';
export type {
  ActContext,
  InstallRequest,
  RegisterTargetRequest,
  RemoveRequest,
  UpgradeRequest,
} from './service';
export {
  createHttpArtifactVersionReader,
  createHttpGmpClassifier,
  createHttpPinVerifier,
} from './clients';
export type {
  ArtifactVersionReader,
  GmpClassification,
  GmpClassifier,
  PinVerifier,
} from './clients';
export { up, down } from './db/migrations';
