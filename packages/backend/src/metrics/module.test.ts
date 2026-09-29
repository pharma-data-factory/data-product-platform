/**
 * The platform produced no numeric signal at all before this module: no
 * metrics, no traces, no error tracking. The endpoint is the cheap half of
 * fixing that, because `prom-client` is already in the process and the
 * catalog already writes to its default registry.
 *
 * What these tests hold is that the endpoint exists, that it renders the
 * registry the catalog writes to, and that it stays registered in `index.ts`
 * — the last one because a metrics endpoint is exactly the kind of thing that
 * gets dropped in a merge and is not missed until an incident.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Counter, register } from 'prom-client';
import { createMetricsHandler, rootModuleMetrics } from './module';

function fakeResponse() {
  const res = {
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    statusCode: 200,
    set(field: string, value: string) {
      res.headers[field] = value;
      return res;
    },
    send(body: string) {
      res.body = body;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return { end: () => res };
    },
  };
  return res;
}

const silentLogger = { error: jest.fn() };

describe('metrics handler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders in the Prometheus exposition format', async () => {
    const res = fakeResponse();

    await createMetricsHandler(silentLogger)(undefined, res);

    expect(res.headers['Content-Type']).toBe(register.contentType);
    expect(res.headers['Content-Type']).toContain('text/plain');
    expect(typeof res.body).toBe('string');
  });

  // The point of using the default registry rather than a private one: what
  // the catalog and scaffolder already record comes out of this endpoint
  // without either of them being touched.
  it('exposes metrics registered by other code in the default registry', async () => {
    const counter = new Counter({
      name: 'nexora_metrics_module_probe_total',
      help: 'Probe asserting the shared default registry is the one served.',
    });
    counter.inc(3);

    const res = fakeResponse();
    await createMetricsHandler(silentLogger)(undefined, res);

    expect(res.body).toContain('nexora_metrics_module_probe_total 3');

    register.removeSingleMetric('nexora_metrics_module_probe_total');
  });

  it('answers 500 and logs when the registry cannot be rendered', async () => {
    jest
      .spyOn(register, 'metrics')
      .mockRejectedValue(new Error('registry exploded'));
    const logger = { error: jest.fn() };
    const res = fakeResponse();

    await createMetricsHandler(logger)(undefined, res);

    expect(res.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('registry exploded'),
    );
  });
});

describe('metrics module registration', () => {
  it('is a root module', () => {
    expect(rootModuleMetrics).toBeDefined();
  });

  // Structural rather than behavioural on purpose: the failure this guards
  // against is the module quietly ceasing to be wired in, which no runtime
  // test of the module itself can see.
  it('stays registered in the backend entrypoint', () => {
    const index = readFileSync(resolve(__dirname, '..', 'index.ts'), 'utf8');

    expect(index).toContain("from './metrics/module'");
    expect(index).toContain('backend.add(rootModuleMetrics)');
  });
});
