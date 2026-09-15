export { ursComposerPlugin } from './plugin';

/**
 * Exposed so the Scaffolder URS baseline picker in packages/app can list
 * approved baselines. The picker has to live where the Scaffolder form is
 * registered, but the API belongs to this plugin.
 */
export { ursComposerApiRef, type URSComposerApi } from './api/ursComposerApi';
export type { ApprovedBaselineOption } from './api/types';
export {
  rootRouteRef,
  libraryRouteRef,
  createRouteRef_,
  editRouteRef,
  requirementSetRouteRef,
  changeSetRouteRef,
} from './routes';
