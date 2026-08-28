import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { loadFactoryModel, validateFactoryModel } from './factory';
import {
  advanceTick,
  createInitialState,
  applyScenario,
} from './engine';
import { isAutoinjectorFactory } from './autoinjectorCampaign';

const AI_FACTORY = path.resolve(
  __dirname,
  '../../../model-company/factories/autoinjector-pharma.yaml',
);
const LEGACY_FACTORY = path.resolve(
  __dirname,
  '../../../model-company/factories/model-pharma.yaml',
);

function runTicks(model: ReturnType<typeof loadFactoryModel>, scenarioId: any, ticks: number, seed = 42) {
  let state = createInitialState(model, seed, scenarioId);
  state = { ...state, status: 'RUNNING' };
  state = applyScenario(state, scenarioId, seed);
  state = { ...state, status: 'RUNNING' };
  let last = state;
  for (let i = 0; i < ticks; i++) {
    const result = advanceTick(model, last);
    last = result.state;
  }
  return last;
}

describe('autoinjector factory-as-code', () => {
  it('loads autoinjector plant with value-stream areas', () => {
    const model = loadFactoryModel(AI_FACTORY);
    expect(validateFactoryModel(model)).toEqual([]);
    expect(isAutoinjectorFactory(model)).toBe(true);
    expect(model.equipment.some(e => e.id === 'SYRINGE-FILLER-01')).toBe(true);
    expect(model.equipment.some(e => e.id === 'DEVICE-ASSEMBLER-01')).toBe(true);
    expect(model.equipment.some(e => e.id === 'SERIALIZATION-STATION-01')).toBe(true);
  });

  it('keeps legacy model-pharma loadable', () => {
    const model = loadFactoryModel(LEGACY_FACTORY);
    expect(validateFactoryModel(model)).toEqual([]);
    expect(model.equipment).toHaveLength(15);
  });
});

describe('SCN-AI scenarios', () => {
  const model = loadFactoryModel(AI_FACTORY);

  it('SCN-AI-001 / SCN-AI-010 complete genealogy to FG HUs', () => {
    const state = runTicks(model, 'SCN-AI-010', 80);
    expect(state.campaign?.phase).toBe('COMPLETE');
    expect(state.batches?.find(b => b.batchId === 'DPB-260823-001')?.status).toBe(
      'RELEASED',
    );
    expect(state.batches?.find(b => b.batchId === 'AIB-260823-001')?.goodQuantity).toBe(
      48540,
    );
    expect(state.orders.find(o => o.orderId === 'PO-PKG-100003')?.goodQuantity).toBe(48000);
    expect(state.warehouse.some(h => h.huId === 'HU-FG-100001')).toBe(true);
    expect(state.genealogy?.some(g => g.to === 'HU-FG-100001')).toBe(true);
  });

  it('SCN-AI-002 blocks assembly while DP on QUALITY_HOLD', () => {
    const state = runTicks(model, 'SCN-AI-002', 30);
    expect(state.batches?.find(b => b.batchId === 'DPB-260823-001')?.status).toBe(
      'QUALITY_HOLD',
    );
    expect(state.campaign?.assemblyBlocked).toBe(true);
    expect(state.orders.find(o => o.orderId === 'PO-AI-100002')?.status).toBe('BLOCKED');
  });

  it('SCN-AI-004 puts DEVICE-ASSEMBLER-01 into BREAKDOWN', () => {
    const state = runTicks(model, 'SCN-AI-004', 35);
    expect(state.equipment['DEVICE-ASSEMBLER-01'].state).toBe('BREAKDOWN');
  });

  it('SCN-AI-006 blocks packaging when cartons missing', () => {
    const state = runTicks(model, 'SCN-AI-006', 55);
    expect(state.campaign?.packagingMaterialsStaged).toBe(false);
    expect(state.orders.find(o => o.orderId === 'PO-PKG-100003')?.status).toBe(
      'BLOCKED_MATERIAL',
    );
  });

  it('scenario YAML expected outcomes exist for all SCN-AI-*', () => {
    const dir = path.resolve(
      __dirname,
      '../../../model-company/scenarios/autoinjector',
    );
    for (let i = 1; i <= 10; i++) {
      const id = `SCN-AI-${String(i).padStart(3, '0')}`;
      const file = path.join(dir, `${id}.yaml`);
      expect(fs.existsSync(file)).toBe(true);
      const doc = yaml.parse(fs.readFileSync(file, 'utf8'));
      expect(doc.id).toBe(id);
      expect(doc.expected).toBeTruthy();
    }
  });

  it('is deterministic for same seed', () => {
    const a = runTicks(model, 'SCN-AI-001', 75, 42);
    const b = runTicks(model, 'SCN-AI-001', 75, 42);
    expect(a.orders).toEqual(b.orders);
    expect(a.batches).toEqual(b.batches);
    expect(a.campaign?.phase).toBe(b.campaign?.phase);
  });
});
