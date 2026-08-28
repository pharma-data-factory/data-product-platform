/**
 * Customer Zero integration proof (optional live services):
 * SCN-AI-007 → CHECKWEIGHER-01 → Platform UNS → Mosquitto → OEE API
 *
 * Requires model-company/runtime Compose:
 *   mosquitto :41884, scenario-engine :18091, oee-checkweigher :18080
 *
 * When services are down the suite skips (does not fail CI unit jobs).
 * Set MODEL_COMPANY_E2E=1 to fail if services are unavailable.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import mqtt from 'mqtt';
import { ModelCompanyService } from './service';
import { FileSimulationStore } from './store';

const RUNTIME = process.env.MODEL_COMPANY_RUNTIME_URL ?? 'http://127.0.0.1:18091';
const OEE = process.env.MODEL_COMPANY_OEE_URL ?? 'http://127.0.0.1:18080';
const MQTT_URL = process.env.MODEL_COMPANY_MQTT_URL ?? 'mqtt://127.0.0.1:41884';
const TOPIC =
  'uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/CHECKWEIGHER-01/state';
const REQUIRE = process.env.MODEL_COMPANY_E2E === '1';

const FACTORY = path.resolve(
  __dirname,
  '../../../model-company/factories/autoinjector-pharma.yaml',
);

const logger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: () => logger,
} as any;

async function healthy(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('Customer Zero MQTT → OEE E2E', () => {
  jest.setTimeout(180_000);

  let skipReason: string | undefined;

  beforeAll(async () => {
    if (!(await healthy(`${RUNTIME}/health`))) {
      skipReason = `Scenario Runtime not reachable at ${RUNTIME}`;
    } else if (!(await healthy(`${OEE}/health`))) {
      skipReason = `OEE service not reachable at ${OEE}`;
    }
    if (skipReason && REQUIRE) {
      throw new Error(skipReason);
    }
  });

  it('SCN-AI-007 → Mosquitto (independent sub) → OEE live result (source != fixture)', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const seed = Date.now() % 1_000_000_000;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-e2e-'));
    const observed: Array<{ topic: string; payload: Record<string, unknown> }> =
      [];

    const client = mqtt.connect(MQTT_URL, {
      clientId: `e2e-sub-${seed}`,
      clean: true,
      connectTimeout: 8000,
    });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('MQTT connect timeout')), 10000);
      client.once('connect', () => {
        clearTimeout(t);
        resolve();
      });
      client.once('error', err => {
        clearTimeout(t);
        reject(err);
      });
    });
    await new Promise<void>((resolve, reject) => {
      client.subscribe(TOPIC, { qos: 1 }, err => (err ? reject(err) : resolve()));
    });
    client.on('message', (topic, buf) => {
      try {
        observed.push({ topic, payload: JSON.parse(buf.toString()) });
      } catch {
        /* ignore */
      }
    });

    const store = new FileSimulationStore(
      path.join(tmp, 'state.json'),
      path.join(tmp, 'events.jsonl'),
    );
    const service = new ModelCompanyService({
      factoryPath: FACTORY,
      store,
      logger,
      runtimeBaseUrl: RUNTIME,
      brokerConfigured: true,
    });

    service.reset(seed);
    const started = service.runScenario('SCN-AI-007', seed, false);
    expect(started.scenarioId).toBe('SCN-AI-007');
    expect(started.runId).toContain(String(seed));

    for (let i = 0; i < 60; i += 1) {
      service.tickOnce();
    }

    const deadline = Date.now() + 45_000;
    while (
      Date.now() < deadline &&
      !observed.some(m => {
        const inner = m.payload.payload as { state?: string } | undefined;
        return (
          m.topic === TOPIC &&
          inner?.state === 'MICROSTOP' &&
          String(m.payload.eventId ?? '').includes(String(seed))
        );
      })
    ) {
      await new Promise(r => setTimeout(r, 250));
    }
    client.end(true);

    expect(observed.length).toBeGreaterThan(0);
    const msg = observed.find(m => {
      const inner = m.payload.payload as { state?: string } | undefined;
      return (
        m.topic === TOPIC &&
        inner?.state === 'MICROSTOP' &&
        String(m.payload.eventId ?? '').includes(String(seed))
      );
    });
    expect(msg).toBeDefined();
    expect(msg!.payload.schemaVersion).toBe('1.0');
    expect(msg!.payload.equipmentId).toBe('CHECKWEIGHER-01');
    const inner = msg!.payload.payload as Record<string, unknown>;
    expect(inner.state).toBe('MICROSTOP');
    expect(inner.reasonCode).toBe('PRODUCT_JAM');
    expect(msg!.payload.dataQuality).toBeDefined();
    expect(String(msg!.payload.eventId)).toContain(String(seed));

    const ctxRes = await fetch(`${OEE}/api/v1/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contextId: `ctx-e2e-${seed}`,
        equipmentId: 'CHECKWEIGHER-01',
        timestamp: new Date().toISOString(),
        idealCycleTimeSeconds: 0.5,
        site: 'MODEL-PHARMA-01',
        area: 'packaging',
        line: 'PKG-L01',
        orderId: 'PO-PKG-100003',
        batchId: 'FGB-260823-001',
      }),
    });
    expect(ctxRes.ok).toBe(true);

    let oeeBody: Record<string, unknown> | undefined;
    const oeeDeadline = Date.now() + 60_000;
    while (Date.now() < oeeDeadline) {
      const res = await fetch(`${OEE}/api/v1/oee/CHECKWEIGHER-01?window=hour`);
      if (res.ok) {
        oeeBody = (await res.json()) as Record<string, unknown>;
        if (oeeBody.equipmentId === 'CHECKWEIGHER-01') {
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    expect(oeeBody).toBeDefined();
    expect(oeeBody!.equipmentId).toBe('CHECKWEIGHER-01');
    expect(oeeBody).not.toMatchObject({ source: 'fixture' });
    expect(oeeBody!.calculationStatus).toBeDefined();
    expect(Number(oeeBody!.downtimeSeconds ?? 0)).toBeGreaterThan(0);
    expect(service.getState().equipment['CHECKWEIGHER-01'].state).toBe('MICROSTOP');
  });
});
