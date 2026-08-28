import type {
  EquipmentRuntime,
  EquipmentState,
  FactoryModel,
  ScenarioId,
  SimulationSpeed,
  SimulationState,
  SyntheticOrder,
  UnsMessage,
  WarehouseHu,
} from './types';
import { isAutoinjectorScenario, scenarioById } from './scenarios';
import {
  advanceAutoinjectorCampaign,
  autoinjectorOrders,
  initialBatches,
  initialCampaign,
  initialGenealogy,
  isAutoinjectorFactory,
} from './autoinjectorCampaign';
import {
  buildEnvelope,
  equipmentTopic,
  orderTopic,
  qosForInformationType,
  retainForInformationType,
  unsConfigFromModel,
  validateCounts,
  warehouseHuTopic,
  type UnsConfig,
} from './uns/topics';

/** Mulberry32 — deterministic PRNG from seed + tick. */
export function createRng(seed: number, tick: number): () => number {
  let t = (seed + tick * 1013904223) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultOrders(): SyntheticOrder[] {
  return [
    {
      orderId: 'PO-10004567',
      material: 'MAT-TAB-500MG',
      batch: 'B26082301',
      targetQuantity: 120000,
      goodQuantity: 48000,
      rejectQuantity: 120,
      status: 'IN_PROCESS',
      lineId: 'MFG-L01',
    },
    {
      orderId: 'PO-10004568',
      material: 'MAT-BOT-60CT',
      batch: 'B26082302',
      targetQuantity: 40000,
      goodQuantity: 18500,
      rejectQuantity: 45,
      status: 'IN_PROCESS',
      lineId: 'PKG-L01',
    },
    {
      orderId: 'PO-10004569',
      material: 'MAT-VIAL-10ML',
      batch: 'B26082303',
      targetQuantity: 25000,
      goodQuantity: 9200,
      rejectQuantity: 80,
      status: 'IN_PROCESS',
      lineId: 'FF-L01',
    },
  ];
}

function defaultWarehouse(): WarehouseHu[] {
  return [
    {
      huId: 'HU-900001',
      material: 'API-LOT-A',
      quantity: 200,
      status: 'STAGED',
      location: 'STAGING-01',
    },
    {
      huId: 'HU-900002',
      material: 'EXCIPIENT-B',
      quantity: 500,
      status: 'AVAILABLE',
      location: 'WH-A-12',
    },
    {
      huId: 'HU-900003',
      material: 'BOTTLE-60',
      quantity: 10000,
      status: 'IN_TRANSIT',
      location: 'DOCK-02',
    },
  ];
}

export function createInitialState(
  model: FactoryModel,
  seed = 42,
  scenarioId: ScenarioId = isAutoinjectorFactory(model) ? 'SCN-AI-001' : 'SCN-001',
): SimulationState {
  const scenario = scenarioById(scenarioId);
  const equipment: Record<string, EquipmentRuntime> = {};
  for (const eq of model.equipment) {
    equipment[eq.id] = {
      id: eq.id,
      type: eq.type,
      lineId: eq.lineId,
      areaId: eq.areaId,
      siteId: eq.siteId,
      state: 'IDLE',
      speed: 0,
      targetSpeed: 300,
      goodCount: 0,
      rejectCount: 0,
      temperatureC: eq.capabilities.includes('temperature') ? 22.0 : undefined,
      availability: 'ONLINE',
    };
  }
  const now = new Date().toISOString();
  const autoinjector = isAutoinjectorFactory(model);
  return {
    status: 'STOPPED',
    speed: 1,
    scenarioId,
    scenarioName: scenario.name,
    seed,
    tick: 0,
    updatedAt: now,
    runId: `RUN-${seed}`,
    orders: autoinjector ? autoinjectorOrders() : defaultOrders(),
    warehouse: autoinjector ? [] : defaultWarehouse(),
    equipment,
    eventsPerSec: 0,
    batches: autoinjector ? initialBatches() : undefined,
    genealogy: autoinjector ? initialGenealogy() : undefined,
    serials: autoinjector ? [] : undefined,
    campaign: autoinjector ? initialCampaign(scenarioId) : undefined,
  };
}

function pickState(
  scenarioId: ScenarioId,
  eq: EquipmentRuntime,
  rng: () => number,
  tick: number,
): { state: EquipmentState; reasonCode?: string; temperatureC?: number; availability?: EquipmentRuntime['availability']; dataQuality?: 'GOOD' | 'UNCERTAIN' | 'BAD' | 'STALE' } {
  const primaryBreakdown = 'BOTTLE-FILLER-01';

  switch (scenarioId) {
    case 'SCN-002':
      return { state: 'RUNNING' };
    case 'SCN-003':
      return {
        state: rng() < 0.35 ? 'MICROSTOP' : 'RUNNING',
        reasonCode: 'MICROSTOP',
      };
    case 'SCN-004':
      if (eq.id === primaryBreakdown) {
        return { state: 'BREAKDOWN', reasonCode: 'BREAKDOWN' };
      }
      return {
        state: rng() < 0.2 ? 'MATERIAL_STARVED' : 'RUNNING',
        reasonCode: 'UPSTREAM_DOWN',
      };
    case 'SCN-005':
      return {
        state: rng() < 0.6 ? 'MATERIAL_STARVED' : 'RUNNING',
        reasonCode: 'MATERIAL_STARVATION',
      };
    case 'SCN-006':
      return { state: 'RUNNING', reasonCode: 'QUALITY_SPIKE' };
    case 'SCN-007': {
      const excursion =
        eq.id === 'COATER-01' || eq.id === 'DISPENSER-01'
          ? 28 + rng() * 8
          : eq.temperatureC;
      return {
        state: 'RUNNING',
        temperatureC: excursion,
        reasonCode: 'TEMP_EXCURSION',
        dataQuality: 'UNCERTAIN',
      };
    }
    case 'SCN-008':
      return {
        state: rng() < 0.3 ? 'MATERIAL_STARVED' : 'RUNNING',
        reasonCode: 'WAREHOUSE_DELAY',
      };
    case 'SCN-009': {
      const phase = tick % 30;
      if (phase < 8) return { state: 'STOPPED', reasonCode: 'CHANGEOVER' };
      if (phase < 16) return { state: 'CHANGEOVER', reasonCode: 'CHANGEOVER' };
      if (phase < 18) return { state: 'SETUP', reasonCode: 'CHANGEOVER' };
      return { state: 'RUNNING' };
    }
    case 'SCN-010':
      return {
        state: 'RUNNING',
        reasonCode: 'NETWORK_GAP',
        availability: tick % 7 === 0 ? 'DEGRADED' : 'ONLINE',
        dataQuality: tick % 7 === 0 ? 'STALE' : 'GOOD',
      };
    case 'SCN-001':
    default:
      return {
        state: rng() < 0.08 ? 'STOPPED' : 'RUNNING',
        reasonCode: rng() < 0.08 ? 'MINOR_STOP' : undefined,
      };
  }
}

function makeMessage(
  config: UnsConfig,
  topic: string,
  informationType: string,
  envelopeFields: Parameters<typeof buildEnvelope>[0],
  schemaId: string,
  extraValidation: string[] = [],
): UnsMessage {
  const envelope = buildEnvelope(envelopeFields);
  const validationErrors = [...extraValidation];
  if (schemaId === 'equipment-counts-v1' && envelope.payload) {
    validationErrors.push(
      ...validateCounts(
        envelope.payload as {
          goodCount: number;
          rejectCount: number;
          totalCount: number;
        },
      ),
    );
  }
  return {
    topic,
    qos: qosForInformationType(informationType),
    retained: retainForInformationType(informationType),
    informationType,
    envelope,
    schemaId,
    valid: validationErrors.length === 0,
    validationErrors,
  };
}

export interface TickResult {
  state: SimulationState;
  messages: UnsMessage[];
  skipPublish: boolean;
}

export function advanceTick(model: FactoryModel, state: SimulationState): TickResult {
  if (state.status !== 'RUNNING') {
    return { state, messages: [], skipPublish: true };
  }

  const config = unsConfigFromModel(model);
  const tick = state.tick + 1;
  const rng = createRng(state.seed, tick);
  const siteId = model.sites[0]?.id ?? 'MODEL-PHARMA-01';
  const messages: UnsMessage[] = [];
  const skipPublish =
    (state.scenarioId === 'SCN-010' && tick % 7 === 0) ||
    false;
  const ts = new Date().toISOString();
  const autoinjector =
    isAutoinjectorFactory(model) &&
    (isAutoinjectorScenario(state.scenarioId) || state.campaign !== undefined);

  let equipment: Record<string, EquipmentRuntime> = { ...state.equipment };
  let orders = state.orders.map(o => ({ ...o }));
  let warehouse = state.warehouse.map(h => ({ ...h }));
  let batches = state.batches;
  let genealogy = state.genealogy;
  let serials = state.serials;
  let campaign = state.campaign;

  if (autoinjector) {
    const campaignResult = advanceAutoinjectorCampaign({
      model,
      state,
      config,
      tick,
      ts,
      skipPublish,
      equipment,
    });
    equipment = campaignResult.equipment;
    orders = campaignResult.orders;
    warehouse = campaignResult.warehouse;
    batches = campaignResult.batches;
    genealogy = campaignResult.genealogy;
    serials = campaignResult.serials;
    campaign = campaignResult.campaign;
    if (!skipPublish) {
      messages.push(...campaignResult.messages);
    }

    // Publish equipment deltas from campaign-driven runtime
    for (const [id, next] of Object.entries(equipment)) {
      const prev = state.equipment[id];
      if (!prev || skipPublish) continue;
      const factoryEq = model.equipment.find(e => e.id === id)!;
      const order = orders.find(o => o.lineId === next.lineId);
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'availability'),
          'availability',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-avail`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: 'GOOD',
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              status: next.availability,
              source: 'equipment-simulator',
              dataQuality: 'GOOD',
            },
          },
          'equipment-availability-v1',
        ),
      );
      if (prev.state !== next.state) {
        messages.push(
          makeMessage(
            config,
            equipmentTopic(config, factoryEq, 'state'),
            'state',
            {
              eventId: `EVT-${state.seed}-${tick}-${id}-state`,
              timestamp: ts,
              config,
              siteId,
              areaId: next.areaId,
              lineId: next.lineId,
              equipmentId: id,
              orderId: order?.orderId,
              batchId: order?.batch,
              dataQuality: 'GOOD',
              payload: {
                schemaVersion: '1.0',
                timestamp: ts,
                equipmentId: id,
                state: next.state,
                previousState: prev.state,
                reasonCode: next.reasonCode ?? null,
                dataQuality: 'GOOD',
              },
            },
            'equipment-state-v1',
          ),
        );
      }
      const totalCount = next.goodCount + next.rejectCount;
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'counts'),
          'counts',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-cnt`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: 'GOOD',
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              equipmentId: id,
              goodCount: next.goodCount,
              rejectCount: next.rejectCount,
              totalCount,
              dataQuality: 'GOOD',
            },
          },
          'equipment-counts-v1',
        ),
      );
    }

    const nextState: SimulationState = {
      ...state,
      tick,
      updatedAt: ts,
      equipment,
      orders,
      warehouse,
      batches,
      genealogy,
      serials,
      campaign,
      eventsPerSec: messages.length,
    };
    return { state: nextState, messages: skipPublish ? [] : messages, skipPublish };
  }

  for (const [id, prev] of Object.entries(equipment)) {
    const next = { ...prev };
    const picked = pickState(state.scenarioId, prev, rng, tick);
    const prevState = prev.state;
    next.state = picked.state;
    next.reasonCode = picked.reasonCode;
    next.availability = picked.availability ?? 'ONLINE';
    const dq = picked.dataQuality ?? 'GOOD';

    if (picked.temperatureC !== undefined) {
      next.temperatureC = Number(picked.temperatureC.toFixed(2));
    } else if (next.temperatureC !== undefined && state.scenarioId !== 'SCN-007') {
      next.temperatureC = Number((22 + rng() * 1.5).toFixed(2));
    }

    if (next.state === 'RUNNING') {
      next.speed = state.scenarioId === 'SCN-002' ? 100 : 70 + Math.floor(rng() * 25);
      next.targetSpeed = 300;
      const goodDelta =
        state.scenarioId === 'SCN-002' ? 40 + Math.floor(rng() * 10) : 20 + Math.floor(rng() * 20);
      next.goodCount += goodDelta * Math.max(1, Math.floor(state.speed / 5) || 1);
      const rejectBoost =
        state.scenarioId === 'SCN-006' &&
        (id === 'CHECKWEIGHER-01' || id === 'INSPECTION-01')
          ? 8 + Math.floor(rng() * 12)
          : state.scenarioId === 'SCN-002'
            ? 0
            : Math.floor(rng() * 2);
      next.rejectCount += rejectBoost;
    } else {
      next.speed = 0;
    }

    equipment[id] = next;
    const factoryEq = model.equipment.find(e => e.id === id)!;
    const order = state.orders.find(o => o.lineId === next.lineId);

    if (!skipPublish) {
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'availability'),
          'availability',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-avail`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: dq,
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              status: next.availability,
              source: 'equipment-simulator',
              dataQuality: dq,
            },
          },
          'equipment-availability-v1',
        ),
      );
    }

    if (prevState !== next.state && !skipPublish) {
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'state'),
          'state',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-state`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: dq,
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              equipmentId: id,
              state: next.state,
              previousState: prevState,
              reasonCode: next.reasonCode ?? null,
              dataQuality: dq,
            },
          },
          'equipment-state-v1',
        ),
      );

      const eventName =
        next.state === 'MICROSTOP'
          ? 'microstop'
          : next.state === 'BREAKDOWN'
            ? 'breakdown'
            : 'equipment-state-changed';
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, `events/${eventName}`),
          `events/${eventName}`,
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-ev`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: dq,
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              equipmentId: id,
              eventName,
              reasonCode: next.reasonCode ?? null,
              dataQuality: dq,
            },
          },
          'equipment-event-v1',
        ),
      );
    }

    if (!skipPublish) {
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'telemetry'),
          'telemetry',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-tel`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            dataQuality: dq,
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              equipmentId: id,
              speed: next.speed,
              targetSpeed: next.targetSpeed,
              temperature: next.temperatureC ?? null,
              dataQuality: dq,
            },
          },
          'equipment-telemetry-v1',
        ),
      );

      const totalCount = next.goodCount + next.rejectCount;
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'counts'),
          'counts',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-cnt`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            orderId: order?.orderId,
            batchId: order?.batch,
            dataQuality: 'GOOD',
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              equipmentId: id,
              goodCount: next.goodCount,
              rejectCount: next.rejectCount,
              totalCount,
              dataQuality: 'GOOD',
            },
          },
          'equipment-counts-v1',
        ),
      );
    }

    if (
      !skipPublish &&
      factoryEq.capabilities.includes('temperature') &&
      next.temperatureC !== undefined
    ) {
      const lower = 18;
      const upper = 25;
      const outOfBand = next.temperatureC < lower || next.temperatureC > upper;
      messages.push(
        makeMessage(
          config,
          equipmentTopic(config, factoryEq, 'temperature'),
          'temperature',
          {
            eventId: `EVT-${state.seed}-${tick}-${id}-temp`,
            timestamp: ts,
            config,
            siteId,
            areaId: next.areaId,
            lineId: next.lineId,
            equipmentId: id,
            dataQuality: outOfBand ? 'UNCERTAIN' : 'GOOD',
            payload: {
              schemaVersion: '1.0',
              timestamp: ts,
              value: next.temperatureC,
              unit: 'C',
              lowerLimit: lower,
              upperLimit: upper,
              dataQuality: outOfBand ? 'UNCERTAIN' : 'GOOD',
            },
          },
          'temperature-v1',
        ),
      );
    }
  }

  orders = state.orders.map(o => ({ ...o }));
  for (const order of orders) {
    if (state.scenarioId === 'SCN-005') {
      order.status = 'BLOCKED_MATERIAL';
    } else if (state.scenarioId === 'SCN-009' && tick % 30 === 16) {
      order.status = 'CHANGEOVER_COMPLETE';
    } else {
      order.status = 'IN_PROCESS';
      const lineEq = Object.values(equipment).filter(e => e.lineId === order.lineId);
      const good = lineEq.reduce((s, e) => s + e.goodCount, 0);
      const reject = lineEq.reduce((s, e) => s + e.rejectCount, 0);
      order.goodQuantity = Math.min(
        order.targetQuantity,
        Math.floor(good / Math.max(1, lineEq.length)),
      );
      order.rejectQuantity = reject;
    }

    if (!skipPublish) {
      messages.push(
        makeMessage(
          config,
          orderTopic(config, siteId, order.orderId),
          'orders/state',
          {
            eventId: `EVT-${state.seed}-${tick}-${order.orderId}`,
            timestamp: ts,
            config,
            siteId,
            lineId: order.lineId,
            orderId: order.orderId,
            batchId: order.batch,
            payload: {
              schemaVersion: '1.0',
              orderId: order.orderId,
              materialId: order.material,
              batchId: order.batch,
              plannedQuantity: order.targetQuantity,
              uom: 'EA',
              lineId: order.lineId,
              status: order.status,
            },
          },
          'production-order-v1',
        ),
      );
    }
  }

  warehouse = state.warehouse.map(h => ({ ...h }));
  if (state.scenarioId === 'SCN-008') {
    for (const hu of warehouse) {
      if (hu.status === 'IN_TRANSIT' || hu.status === 'STAGED') {
        hu.status = 'DELAYED';
      }
    }
  }
  if (!skipPublish) {
    for (const hu of warehouse) {
      messages.push(
        makeMessage(
          config,
          warehouseHuTopic(config, siteId, hu.huId),
          'warehouse/hu',
          {
            eventId: `EVT-${state.seed}-${tick}-${hu.huId}`,
            timestamp: ts,
            config,
            siteId,
            payload: {
              schemaVersion: '1.0',
              huId: hu.huId,
              materialId: hu.material,
              quantity: hu.quantity,
              status: hu.status,
              location: hu.location,
            },
          },
          'handling-unit-v1',
        ),
      );
    }
  }

  const nextState: SimulationState = {
    ...state,
    tick,
    updatedAt: ts,
    equipment,
    orders,
    warehouse,
    eventsPerSec: messages.length,
  };

  return { state: nextState, messages: skipPublish ? [] : messages, skipPublish };
}

export function applyScenario(
  state: SimulationState,
  scenarioId: ScenarioId,
  seed?: number,
): SimulationState {
  const scenario = scenarioById(scenarioId);
  const nextSeed = seed ?? state.seed;
  return {
    ...state,
    scenarioId,
    scenarioName: scenario.name,
    seed: nextSeed,
    tick: 0,
    runId: `RUN-${nextSeed}-${scenarioId}`,
    updatedAt: new Date().toISOString(),
    campaign: state.campaign
      ? {
          ...initialCampaign(scenarioId),
          productFamily: state.campaign.productFamily,
        }
      : isAutoinjectorScenario(scenarioId)
        ? initialCampaign(scenarioId)
        : undefined,
    orders: state.campaign || isAutoinjectorScenario(scenarioId)
      ? autoinjectorOrders()
      : state.orders,
    batches: state.campaign || isAutoinjectorScenario(scenarioId)
      ? initialBatches()
      : state.batches,
    genealogy: state.campaign || isAutoinjectorScenario(scenarioId)
      ? initialGenealogy()
      : state.genealogy,
    serials: state.campaign || isAutoinjectorScenario(scenarioId) ? [] : state.serials,
    warehouse: state.campaign || isAutoinjectorScenario(scenarioId) ? [] : state.warehouse,
    equipment: Object.fromEntries(
      Object.entries(state.equipment).map(([id, eq]) => [
        id,
        {
          ...eq,
          state: 'IDLE' as const,
          speed: 0,
          goodCount: 0,
          rejectCount: 0,
          reasonCode: undefined,
          availability: 'ONLINE' as const,
        },
      ]),
    ),
  };
}

export function setSpeed(state: SimulationState, speed: SimulationSpeed): SimulationState {
  return { ...state, speed, updatedAt: new Date().toISOString() };
}
