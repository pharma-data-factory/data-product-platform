/**
 * Prometheus scrape endpoint for the control plane.
 *
 * Until this module the platform produced no numeric signal of any kind: no
 * metrics, no traces, no error tracking. That is why an operator could not
 * tell a slow database from a slow LLM call, and why the question "what
 * happens at ten times the load" had no answer that was not a guess.
 *
 * Almost all of the value here is already sitting in the process. `prom-client`
 * is a dependency of `@backstage/plugin-catalog-backend` and
 * `@backstage/plugin-scaffolder-backend`, and both register into its *default*
 * registry — `catalog_entities_count`,
 * `catalog_processing_duration_seconds`, `catalog_processing_queue_delay_seconds`
 * and the rest have been recorded all along with nothing able to read them.
 * This module adds the endpoint that exposes them, plus
 * `collectDefaultMetrics` for the process itself: heap, GC, handles and
 * `nodejs_eventloop_lag_seconds`.
 *
 * **Per-route RED metrics are deliberately not here.** They need a middleware
 * ahead of every route, and `rootHttpRouter` appends handlers to one Express
 * router in registration order — a middleware added by a module would cover
 * whatever happened to register after it, which is worse than no data because
 * the gaps are invisible. That belongs to OpenTelemetry auto-instrumentation,
 * which patches `http` itself and has no ordering to lose.
 */

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { collectDefaultMetrics, register } from 'prom-client';

/**
 * Guards against `collectDefaultMetrics` being called twice.
 *
 * It throws on a duplicate metric name, and the integration tests build more
 * than one backend in a single process.
 */
let defaultMetricsStarted = false;

/** Minimal shapes, so the handler is reachable from a test without a backend. */
type MetricsResponse = {
  set(field: string, value: string): unknown;
  send(body: string): unknown;
  status(code: number): { end(): unknown };
};
type MetricsLogger = { error(message: string): unknown };

/**
 * The `/metrics` handler, separated from the module only so it can be
 * exercised directly. `register` is the prom-client default registry — the
 * one the catalog and scaffolder already write to.
 */
export function createMetricsHandler(logger: MetricsLogger) {
  return async (_req: unknown, res: MetricsResponse) => {
    try {
      res.set('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (error) {
      // A scrape failing must not read as the service being down.
      logger.error(
        `Failed to render metrics: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      res.status(500).end();
    }
  };
}

export const rootModuleMetrics = createBackendModule({
  pluginId: 'root',
  moduleId: 'metrics',
  register(reg) {
    reg.registerInit({
      deps: {
        rootHttpRouter: coreServices.rootHttpRouter,
        config: coreServices.rootConfig,
        logger: coreServices.rootLogger,
      },
      async init({ rootHttpRouter, config, logger }) {
        // On by default: a metrics endpoint nobody can scrape helps nobody.
        // The switch exists so a deployment that cannot restrict the port at
        // the network layer can turn it off rather than patch the backend.
        const enabled =
          config.getOptionalBoolean('backend.metrics.enabled') ?? true;
        if (!enabled) {
          logger.info(
            'Metrics endpoint disabled (backend.metrics.enabled=false)',
          );
          return;
        }

        if (!defaultMetricsStarted) {
          collectDefaultMetrics();
          defaultMetricsStarted = true;
        }

        rootHttpRouter.use('/metrics', createMetricsHandler(logger));

        // Says plainly that the route is open, so it is a decision on the
        // record rather than something discovered by scanning the port.
        logger.info(
          'Metrics exposed at /metrics (unauthenticated — restrict this port ' +
            'to your scrape network, or set backend.metrics.enabled=false)',
        );
      },
    });
  },
});
