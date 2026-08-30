export { authorizationRegistryPlugin as default } from './plugin';
export { authorizationRegistryPlugin } from './plugin';
export { AuthorizationProfileRegistry } from './registry';
export { AuthorizationProfileLoader } from './loader';
export { AuthorizationProfileValidator } from './validator';
export { createRouter } from './router';
export type {
  AuthorizationProfile,
  Permission,
  SuggestedRole,
  ValidationError,
  RegistryDiagnostics,
} from './types';
