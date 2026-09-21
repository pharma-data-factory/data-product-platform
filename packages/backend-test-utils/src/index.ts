/**
 * Test helpers shared by the backend plugins.
 *
 * Node-only and test-only. Nothing here belongs in a production bundle, and
 * nothing here is domain logic — it exists because several suites need the
 * same piece of environment handling and copies of it drift.
 */

export {
  FETCH_BLOCKED_PORTS,
  listenOnFetchablePort,
} from './listen';
export type { Listenable, ListeningServer } from './listen';
