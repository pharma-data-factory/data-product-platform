/**
 * Artifact Registry backend.
 *
 * Persistence and rules for Artifacts, ArtifactVersions and Publishers, plus
 * the HTTP surface over them. Every route is gated by one of the
 * `artifact.*` / `publisher.manage` permissions declared in platform-common,
 * so no registry endpoint exists without the permission that guards it.
 */

export { artifactRegistryPlugin as default } from './plugin';
export { createRouter } from './router';
export type { RouterOptions } from './router';
export { ArtifactRegistryRepository } from './repository';
export { ArtifactRegistryService } from './service';
export type {
  CreatePublisherRequest,
  RegisterArtifactVersionResult,
} from './service';
export { up, down } from './db/migrations';
