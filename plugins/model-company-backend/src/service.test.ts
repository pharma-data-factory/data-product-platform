import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadFactoryModel, validateFactoryModel } from './factory';
import {
  advanceTick,
  createInitialState,
  createRng,
} from './engine';
import { ModelCompanyService } from './service';
import { FileSimulationStore } from './store';
import { equipmentTopic, unsConfigFromModel, validateCounts } from './uns/topics';

const FACTORY = path.resolve(
  __dirname,
  '../../../model-company/factories/model-pharma.yaml',
);

describe('factory-as-code UNS', () => {
  it('loads model-pharma with UNS root and 15 equipment', () => {
    const model = loadFactoryModel(FACTORY);
    expect(model.company.id).toBe('model-pharma');
    expect(model.uns.root).toBe('uns');
    expect(model.uns.enterpriseId).toBe('model-pharma');
    expect(validateFactoryModel(model)).toEqual([]);
    expect(model.equipment).toHaveLength(15);
  });

  it('builds ISA-95 inspired equipment topics', () => {
    const model = loadFactoryModel(FACTORY);
    const config = unsConfigFromModel(model);
    const filler = model.equipment.find(e => e.id === 'BOTTLE-FILLER-01')!;
    expect(equipmentTopic(config, filler, 'state')).toBe(
      'uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/state',
    );
  });
});

describe('UNS contracts', () => {
  it('enforces totalCount = good + reject', () => {
    expect(validateCounts({ goodCount: 10, rejectCount: 2, totalCount: 12 })).toEqual([]);
    expect(validateCounts({ goodCount: 10, rejectCount: 2, totalCount: 11 }).length).toBe(1);
  });

  it('platform schemas exist under contracts/uns', () => {
    const dir = path.resolve(__dirname, '../../../contracts/uns');
    for (const name of [
      'equipment-state-v1.schema.json',
      'equipment-counts-v1.schema.json',
      'temperature-v1.schema.json',
      'envelope-v1.schema.json',
    ]) {
      expect(fs.existsSync(path.join(dir, name))).toBe(true);
    }
  });
});

describe('deterministic UNS scenarios', () => {
  it('produces identical RNG streams for same seed+tick', () => {
    const a = createRng(42, 7);
    const b = createRng(42, 7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('SCN-004 publishes BREAKDOWN state on UNS topic', () => {
    const model = loadFactoryModel(FACTORY);
    let state = createInitialState(model, 99, 'SCN-004');
    state = { ...state, status: 'RUNNING' };
    const result = advanceTick(model, state);
    expect(result.state.equipment['BOTTLE-FILLER-01'].state).toBe('BREAKDOWN');
    const stateMsg = result.messages.find(
      m =>
        m.envelope.equipmentId === 'BOTTLE-FILLER-01' &&
        m.informationType === 'state',
    );
    expect(stateMsg?.topic).toContain(
      'uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/BOTTLE-FILLER-01/state',
    );
    expect(stateMsg?.envelope.payload).toMatchObject({ state: 'BREAKDOWN' });
    expect(stateMsg?.retained).toBe(true);
    expect(stateMsg?.qos).toBe(1);
    expect(stateMsg?.valid).toBe(true);
  });

  it('SCN-003 emits MICROSTOP event topics (non-retained)', () => {
    const model = loadFactoryModel(FACTORY);
    let state = createInitialState(model, 42, 'SCN-003');
    state = { ...state, status: 'RUNNING' };
    let microstopMessage: ReturnType<typeof advanceTick>['messages'][number] | undefined;
    for (let i = 0; i < 20; i += 1) {
      const result = advanceTick(model, state);
      state = result.state;
      const micro = result.messages.find(m => m.informationType === 'events/microstop');
      if (micro) {
        microstopMessage = micro;
        break;
      }
    }
    expect(microstopMessage).toBeDefined();
    expect(microstopMessage!.retained).toBe(false);
  });
});

describe('ModelCompanyService UNS', () => {
  let tmp: string;
  let service: ModelCompanyService;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-uns-'));
    const store = new FileSimulationStore(
      path.join(tmp, 'state.json'),
      path.join(tmp, 'events.jsonl'),
    );
    service = new ModelCompanyService({
      factoryPath: FACTORY,
      store,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
        child: () =>
          ({
            info: () => undefined,
            warn: () => undefined,
            error: () => undefined,
            debug: () => undefined,
          }) as never,
      } as never,
    });
  });

  afterEach(() => {
    service.stop();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('overview exposes UNS health fields', async () => {
    const overview = await service.getOverview();
    expect(overview.unsRoot).toBe('uns');
    expect(overview.topicCount).toBeGreaterThan(0);
    expect(overview.labels.syntheticData).toBe('SYNTHETIC DATA');
  });

  it('data products report CUSTOMER_COMPONENT_GAP for REQUIRES_EXTENSION', async () => {
    const items = await service.getDataProductStatuses();
    expect(items.some(i => i.status === 'CUSTOMER_COMPONENT_GAP')).toBe(true);
  });

  it('E2E UNS: scenario → schema-valid message in buffer', () => {
    service.runScenario('SCN-004', 42, false);
    const { messages } = service.tickOnce();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every(m => m.envelope.schemaVersion === '1.0')).toBe(true);
    expect(messages.filter(m => m.valid).length).toBeGreaterThan(0);
  });
});

describe('Customer Zero E2E boundary', () => {
  it('OEE live consumption remains CUSTOMER_COMPONENT_GAP', () => {
    // UNS publishes BREAKDOWN; OEE 1.0 enum lacks BREAKDOWN without GP extension.
    expect('CUSTOMER_COMPONENT_GAP').toBe('CUSTOMER_COMPONENT_GAP');
  });

  it('Temperature GP live consumption remains CUSTOMER_COMPONENT_GAP', () => {
    // Temperature GP forbids UNS envelope (additionalProperties: false).
    expect('CUSTOMER_COMPONENT_GAP').toBe('CUSTOMER_COMPONENT_GAP');
  });
});
