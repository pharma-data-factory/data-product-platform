import type {
  AutoinjectorCampaign,
  BatchRecord,
  EquipmentRuntime,
  EquipmentState,
  FactoryModel,
  GenealogyLink,
  QualityStatus,
  ScenarioId,
  SerialNode,
  SimulationState,
  SyntheticOrder,
  UnsMessage,
  WarehouseHu,
} from './types';
import {
  batchTopic,
  buildEnvelope,
  equipmentTopic,
  orderTopic,
  qosForInformationType,
  qualityTopic,
  retainForInformationType,
  warehouseHuTopic,
  type UnsConfig,
} from './uns/topics';

export function isAutoinjectorFactory(model: FactoryModel): boolean {
  return model.sites.some(s =>
    s.areas.some(a => a.id === 'DRUG-PRODUCT' || a.id === 'DEVICE-ASSEMBLY'),
  );
}

export function autoinjectorOrders(): SyntheticOrder[] {
  return [
    {
      orderId: 'PO-DP-100001',
      material: 'DP-AUTOINJECTOR-100MG',
      batch: 'DPB-260823-001',
      targetQuantity: 50000,
      goodQuantity: 0,
      rejectQuantity: 0,
      status: 'CREATED',
      lineId: 'DP-L01',
      role: 'drug-product',
      linkedUpstream: undefined,
      linkedDownstream: 'PO-AI-100002',
    },
    {
      orderId: 'PO-AI-100002',
      material: 'AUTOINJECTOR-DEVICE',
      batch: 'AIB-260823-001',
      targetQuantity: 48500,
      goodQuantity: 0,
      rejectQuantity: 0,
      status: 'CREATED',
      lineId: 'AI-L01',
      role: 'assembly',
      linkedUpstream: 'PO-DP-100001',
      linkedDownstream: 'PO-PKG-100003',
    },
    {
      orderId: 'PO-PKG-100003',
      material: 'FG-AUTOINJECTOR-100MG',
      batch: 'FGB-260823-001',
      targetQuantity: 48000,
      goodQuantity: 0,
      rejectQuantity: 0,
      status: 'CREATED',
      lineId: 'PKG-L01',
      role: 'packaging',
      linkedUpstream: 'PO-AI-100002',
      linkedDownstream: undefined,
    },
  ];
}

export function initialCampaign(scenarioId: ScenarioId): AutoinjectorCampaign {
  return {
    productFamily: 'AUTOINJECTOR-100MG',
    phase: 'INIT',
    drugProductReleased: false,
    packagingMaterialsStaged: scenarioId !== 'SCN-AI-006',
    serializationAvailable: scenarioId !== 'SCN-AI-008',
    assemblyBlocked: false,
    packagingBlocked: false,
    functionalTested: 0,
    functionalPassed: 0,
    functionalRejected: 0,
    serialCommissioned: 0,
  };
}

export function initialBatches(): BatchRecord[] {
  return [
    {
      batchId: 'DPB-260823-001',
      materialId: 'DP-AUTOINJECTOR-100MG',
      orderId: 'PO-DP-100001',
      role: 'drug-product',
      status: 'CREATED',
      goodQuantity: 0,
      rejectQuantity: 0,
    },
    {
      batchId: 'AIB-260823-001',
      materialId: 'AUTOINJECTOR-DEVICE',
      orderId: 'PO-AI-100002',
      role: 'assembly',
      status: 'CREATED',
      goodQuantity: 0,
      rejectQuantity: 0,
    },
    {
      batchId: 'FGB-260823-001',
      materialId: 'FG-AUTOINJECTOR-100MG',
      orderId: 'PO-PKG-100003',
      role: 'packaging',
      status: 'CREATED',
      goodQuantity: 0,
      rejectQuantity: 0,
    },
  ];
}

export function initialGenealogy(): GenealogyLink[] {
  return [
    {
      from: 'DPB-260823-001',
      to: 'AIB-260823-001',
      relation: 'consumedBy',
    },
    {
      from: 'AIB-260823-001',
      to: 'FGB-260823-001',
      relation: 'consumedBy',
    },
  ];
}

function msg(
  config: UnsConfig,
  topic: string,
  informationType: string,
  envelopeFields: Parameters<typeof buildEnvelope>[0],
  schemaId: string,
): UnsMessage {
  return {
    topic,
    qos: qosForInformationType(informationType),
    retained: retainForInformationType(informationType),
    informationType,
    envelope: buildEnvelope(envelopeFields),
    schemaId,
    valid: true,
    validationErrors: [],
  };
}

function setEq(
  equipment: Record<string, EquipmentRuntime>,
  id: string,
  patch: Partial<EquipmentRuntime>,
) {
  if (!equipment[id]) return;
  equipment[id] = { ...equipment[id], ...patch };
}

/**
 * Deterministic autoinjector campaign advancement.
 * Does NOT compute OEE — only publishes UNS inputs a customer OEE product would consume.
 */
export function advanceAutoinjectorCampaign(options: {
  model: FactoryModel;
  state: SimulationState;
  config: UnsConfig;
  tick: number;
  ts: string;
  skipPublish: boolean;
  equipment: Record<string, EquipmentRuntime>;
}): {
  equipment: Record<string, EquipmentRuntime>;
  orders: SyntheticOrder[];
  warehouse: WarehouseHu[];
  batches: BatchRecord[];
  genealogy: GenealogyLink[];
  serials: SerialNode[];
  campaign: AutoinjectorCampaign;
  messages: UnsMessage[];
} {
  const { model, state, config, tick, ts, skipPublish } = options;
  const scenarioId = state.scenarioId;
  const siteId = model.sites[0]?.id ?? 'MODEL-PHARMA-01';
  const equipment = { ...options.equipment };
  const orders = (state.orders.length ? state.orders : autoinjectorOrders()).map(o => ({
    ...o,
  }));
  const batches = (state.batches?.length ? state.batches : initialBatches()).map(b => ({
    ...b,
  }));
  const genealogy = state.genealogy?.length
    ? state.genealogy.map(g => ({ ...g }))
    : initialGenealogy();
  let warehouse = (state.warehouse ?? []).map(h => ({ ...h }));
  let serials = (state.serials ?? []).map(s => ({ ...s }));
  const campaign: AutoinjectorCampaign = {
    ...(state.campaign ?? initialCampaign(scenarioId)),
  };
  const messages: UnsMessage[] = [];
  const seed = state.seed;

  const dpOrder = orders.find(o => o.orderId === 'PO-DP-100001')!;
  const aiOrder = orders.find(o => o.orderId === 'PO-AI-100002')!;
  const pkgOrder = orders.find(o => o.orderId === 'PO-PKG-100003')!;
  const dpBatch = batches.find(b => b.batchId === 'DPB-260823-001')!;
  const aiBatch = batches.find(b => b.batchId === 'AIB-260823-001')!;
  const fgBatch = batches.find(b => b.batchId === 'FGB-260823-001')!;

  const holdForever = scenarioId === 'SCN-AI-002';
  const rejectSpike = scenarioId === 'SCN-AI-003';
  const assemblerDown = scenarioId === 'SCN-AI-004';
  const funcSpike = scenarioId === 'SCN-AI-005';
  const noCartons = scenarioId === 'SCN-AI-006';
  const microstorm = scenarioId === 'SCN-AI-007';
  const serialOutage = scenarioId === 'SCN-AI-008';
  const whDelay = scenarioId === 'SCN-AI-009';

  // --- Phase machine by tick ---
  if (tick === 1) {
    campaign.phase = 'DP_RELEASE';
    dpOrder.status = 'RELEASED';
    dpBatch.status = 'IN_PROCESS';
  }

  if (tick >= 2 && tick <= 5) {
    campaign.phase = 'DP_MANUFACTURING';
    dpOrder.status = 'IN_PROCESS';
    for (const id of ['COMPOUNDER-01', 'HOLDING-TANK-01', 'STERILE-FILTER-01']) {
      setEq(equipment, id, {
        state: tick === 2 ? 'SETUP' : 'RUNNING',
        speed: tick === 2 ? 0 : 80,
      });
    }
    if (tick === 5) {
      for (const id of ['COMPOUNDER-01', 'HOLDING-TANK-01', 'STERILE-FILTER-01']) {
        setEq(equipment, id, { state: 'STOPPED', reasonCode: 'COMPLETED', speed: 0 });
      }
    }
  }

  if (tick >= 6 && tick <= 15) {
    campaign.phase = 'PRIMARY_FILLING';
    const progress = (tick - 5) / 10;
    const goodTarget = rejectSpike ? 45000 : 49420;
    const rejectTarget = rejectSpike ? 5000 : 580;
    const good = Math.floor(goodTarget * progress);
    const reject = Math.floor(rejectTarget * progress);
    const stateFill: EquipmentState =
      tick === 8 ? 'MICROSTOP' : tick === 15 ? 'STOPPED' : 'RUNNING';
    setEq(equipment, 'SYRINGE-FILLER-01', {
      state: stateFill,
      reasonCode: tick === 8 ? 'MICROSTOP' : tick === 15 ? 'COMPLETED' : undefined,
      speed: stateFill === 'RUNNING' ? 120 : 0,
      targetSpeed: 150,
      goodCount: good,
      rejectCount: reject,
    });
    setEq(equipment, 'VISUAL-INSPECTION-01', {
      state: 'RUNNING',
      goodCount: good,
      rejectCount: reject,
    });
    dpOrder.goodQuantity = good;
    dpOrder.rejectQuantity = reject;
    dpBatch.goodQuantity = good;
    dpBatch.rejectQuantity = reject;
  }

  if (tick >= 16 && tick <= 20) {
    campaign.phase = 'DP_QUALITY';
    if (tick === 16) {
      dpBatch.status = 'QUALITY_HOLD';
      dpOrder.status = 'QUALITY_HOLD';
    }
    if (tick >= 18 && !holdForever) {
      dpBatch.status = 'RELEASED';
      dpOrder.status = 'COMPLETED';
      campaign.drugProductReleased = true;
      campaign.assemblyBlocked = false;
    }
    if (holdForever) {
      campaign.drugProductReleased = false;
      campaign.assemblyBlocked = true;
      aiOrder.status = 'BLOCKED';
      aiBatch.status = 'BLOCKED';
    }
  }

  if (tick >= 21 && tick <= 25 && campaign.drugProductReleased) {
    campaign.phase = 'MATERIAL_STAGING';
    warehouse = [
      {
        huId: 'HU-PC-100001',
        material: 'PC-PFS-100MG',
        quantity: dpBatch.goodQuantity,
        status: 'STAGED',
        location: 'AI-STAGING',
        batchId: 'DPB-260823-001',
        qualityStatus: 'RELEASED',
        warehouse: 'FG-WH-01',
      },
      {
        huId: 'HU-DEV-100001',
        material: 'DEV-BODY-001',
        quantity: 50000,
        status: 'STAGED',
        location: 'AI-STAGING',
        qualityStatus: 'RELEASED',
        warehouse: 'FG-WH-01',
      },
      {
        huId: 'HU-SPRING-100001',
        material: 'DEV-SPRING-001',
        quantity: 50000,
        status: 'STAGED',
        location: 'AI-STAGING',
        qualityStatus: 'RELEASED',
        warehouse: 'FG-WH-01',
      },
    ];
  }

  if (tick >= 26 && tick <= 40 && campaign.drugProductReleased) {
    campaign.phase = 'ASSEMBLY';
    aiOrder.status = 'IN_PROCESS';
    aiBatch.status = 'IN_PROCESS';
    const progress = (tick - 25) / 15;
    const tested = Math.floor(48800 * progress);
    const rejectBase = funcSpike ? 2500 : 260;
    const rejected = Math.floor(rejectBase * progress);
    const passed = tested - rejected;

    setEq(equipment, 'PRIMARY-CONTAINER-FEEDER-01', {
      state: 'RUNNING',
      speed: 100,
    });
    setEq(equipment, 'DEVICE-ASSEMBLER-01', {
      state: assemblerDown ? 'BREAKDOWN' : 'RUNNING',
      reasonCode: assemblerDown ? 'BREAKDOWN' : undefined,
      speed: assemblerDown ? 0 : 95,
      targetSpeed: 110,
      goodCount: assemblerDown ? Math.floor(passed * 0.3) : passed,
      rejectCount: rejected,
    });
    setEq(equipment, 'SPRING-ASSEMBLY-01', {
      state: assemblerDown ? 'MATERIAL_STARVED' : 'RUNNING',
      speed: assemblerDown ? 0 : 95,
    });
    setEq(equipment, 'FUNCTIONAL-TESTER-01', {
      state: 'RUNNING',
      goodCount: passed,
      rejectCount: rejected,
    });
    setEq(equipment, 'DEVICE-INSPECTION-01', {
      state: 'RUNNING',
      goodCount: passed,
      rejectCount: rejected,
    });

    if (!assemblerDown) {
      campaign.functionalTested = tested;
      campaign.functionalPassed = passed;
      campaign.functionalRejected = rejected;
      aiOrder.goodQuantity = passed;
      aiOrder.rejectQuantity = rejected;
      aiBatch.goodQuantity = passed;
      aiBatch.rejectQuantity = rejected;
    }
  }

  if (tick === 41 && campaign.drugProductReleased && !assemblerDown) {
    campaign.phase = 'FUNCTIONAL_TEST';
    aiOrder.status = 'COMPLETED';
    aiBatch.status = 'COMPLETED';
    // clamp to expected nominal when not spiked
    if (!funcSpike) {
      campaign.functionalTested = 48800;
      campaign.functionalPassed = 48540;
      campaign.functionalRejected = 260;
      aiOrder.goodQuantity = 48540;
      aiOrder.rejectQuantity = 260;
      aiBatch.goodQuantity = 48540;
      aiBatch.rejectQuantity = 260;
    }
  }

  if (tick >= 42 && tick <= 48) {
    campaign.phase = 'PACKAGING_STAGING';
    if (noCartons) {
      campaign.packagingMaterialsStaged = false;
      campaign.packagingBlocked = true;
      pkgOrder.status = 'BLOCKED_MATERIAL';
      fgBatch.status = 'BLOCKED';
    } else {
      campaign.packagingMaterialsStaged = true;
      warehouse = [
        ...warehouse.filter(h => !h.huId.startsWith('HU-PKG')),
        {
          huId: 'HU-PKG-LABEL-001',
          material: 'PKG-LABEL-001',
          quantity: 50000,
          status: 'STAGED',
          location: 'PKG-STAGING',
          qualityStatus: 'RELEASED',
          warehouse: 'FG-WH-01',
        },
        {
          huId: 'HU-PKG-CARTON-001',
          material: 'PKG-CARTON-001',
          quantity: 50000,
          status: 'STAGED',
          location: 'PKG-STAGING',
          qualityStatus: 'RELEASED',
          warehouse: 'FG-WH-01',
        },
        {
          huId: 'HU-PKG-LEAFLET-001',
          material: 'PKG-LEAFLET-001',
          quantity: 50000,
          status: 'STAGED',
          location: 'PKG-STAGING',
          qualityStatus: 'RELEASED',
          warehouse: 'FG-WH-01',
        },
      ];
    }
  }

  const canPackage =
    campaign.drugProductReleased &&
    campaign.packagingMaterialsStaged &&
    aiBatch.status === 'COMPLETED' &&
    !noCartons;

  if (tick >= 49 && tick <= 70 && canPackage) {
    campaign.phase = 'PACKAGING';
    if (serialOutage) {
      campaign.serializationAvailable = false;
      campaign.packagingBlocked = true;
      pkgOrder.status = 'BLOCKED_SERIALIZATION';
      setEq(equipment, 'SERIALIZATION-STATION-01', {
        state: 'BREAKDOWN',
        reasonCode: 'SERIALIZATION_OUTAGE',
        availability: 'OFFLINE',
      });
    } else {
      pkgOrder.status = 'IN_PROCESS';
      fgBatch.status = 'IN_PROCESS';
      const progress = Math.min(1, (tick - 48) / 20);
      const good = Math.floor(48000 * progress);

      setEq(equipment, 'DEVICE-LABELER-01', {
        state: 'RUNNING',
        goodCount: good,
        rejectCount: Math.floor(40 * progress),
        speed: 90,
      });
      setEq(equipment, 'CARTONER-01', {
        state: 'RUNNING',
        goodCount: good,
        speed: 88,
        targetSpeed: 100,
      });
      setEq(equipment, 'LEAFLET-INSERTER-01', { state: 'RUNNING', speed: 88 });
      setEq(equipment, 'CHECKWEIGHER-01', {
        state: microstorm || tick === 55 ? 'MICROSTOP' : 'RUNNING',
        reasonCode: microstorm || tick === 55 ? 'PRODUCT_JAM' : undefined,
        goodCount: Math.max(0, good - Math.floor(30 * progress)),
        rejectCount: Math.floor(30 * progress),
        speed: microstorm ? 0 : 85,
      });
      setEq(equipment, 'SERIALIZATION-STATION-01', {
        state: 'RUNNING',
        speed: 85,
      });
      setEq(equipment, 'CASE-PACKER-01', {
        state: 'RUNNING',
        goodCount: Math.floor(good / 24),
      });
      setEq(equipment, 'PALLETIZER-01', {
        state: 'RUNNING',
        goodCount: Math.floor(good / 480),
      });

      pkgOrder.goodQuantity = good;
      fgBatch.goodQuantity = good;
      campaign.serialCommissioned = good;

      // lightweight serial sample (not 48k nodes — sample + count)
      if (tick === 60 && serials.length === 0) {
        serials = [
          {
            serialId: 'SN-20260823-00000001',
            level: 'unit',
            status: 'commissioned',
            parentId: 'CARTON-000001',
            batchId: 'FGB-260823-001',
          },
          {
            serialId: 'CARTON-000001',
            level: 'carton',
            status: 'aggregated',
            parentId: 'CASE-000001',
            batchId: 'FGB-260823-001',
          },
          {
            serialId: 'CASE-000001',
            level: 'case',
            status: 'aggregated',
            parentId: 'PALLET-000001',
            batchId: 'FGB-260823-001',
          },
          {
            serialId: 'PALLET-000001',
            level: 'pallet',
            status: 'aggregated',
            batchId: 'FGB-260823-001',
          },
        ];
      }
    }
  }

  if (tick >= 71 && canPackage && !serialOutage) {
    campaign.phase = 'FINISHED_GOODS';
    pkgOrder.goodQuantity = 48000;
    pkgOrder.status = 'COMPLETED';
    fgBatch.goodQuantity = 48000;
    fgBatch.status = whDelay ? 'QUALITY_HOLD' : 'RELEASED';

    const huStatus = whDelay ? 'DELAYED' : 'RECEIVED';
    const qualityStatus: QualityStatus = whDelay ? 'QUALITY_HOLD' : 'RELEASED';
    warehouse = [
      ...warehouse.filter(h => !h.huId.startsWith('HU-FG')),
      {
        huId: 'HU-FG-100001',
        material: 'FG-AUTOINJECTOR-100MG',
        quantity: 24000,
        status: huStatus,
        location: 'FG-WH-01',
        batchId: 'FGB-260823-001',
        qualityStatus,
        warehouse: 'FG-WH-01',
        uom: 'EA',
        createdAt: ts,
      },
      {
        huId: 'HU-FG-100002',
        material: 'FG-AUTOINJECTOR-100MG',
        quantity: 24000,
        status: huStatus,
        location: 'FG-WH-01',
        batchId: 'FGB-260823-001',
        qualityStatus,
        warehouse: 'FG-WH-01',
        uom: 'EA',
        createdAt: ts,
      },
    ];
    genealogy.push(
      { from: 'FGB-260823-001', to: 'HU-FG-100001', relation: 'packedInto' },
      { from: 'FGB-260823-001', to: 'HU-FG-100002', relation: 'packedInto' },
    );
    setEq(equipment, 'FG-RECEIVING-01', {
      state: whDelay ? 'STOPPED' : 'RUNNING',
      reasonCode: whDelay ? 'WAREHOUSE_DELAY' : 'RECEIPT',
    });
    if (tick >= 75) {
      campaign.phase = 'COMPLETE';
    }
  }

  if (!skipPublish) {
    for (const order of orders) {
      messages.push(
        msg(
          config,
          orderTopic(config, siteId, order.orderId),
          'orders/state',
          {
            eventId: `EVT-${seed}-${tick}-${order.orderId}`,
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
              actualGoodQuantity: order.goodQuantity,
              actualRejectQuantity: order.rejectQuantity,
              uom: 'EA',
              lineId: order.lineId,
              status: order.status,
              linkedUpstream: order.linkedUpstream ?? null,
              linkedDownstream: order.linkedDownstream ?? null,
            },
          },
          'production-order-v1',
        ),
      );
    }

    for (const batch of batches) {
      messages.push(
        msg(
          config,
          batchTopic(config, siteId, batch.batchId),
          'batches/state',
          {
            eventId: `EVT-${seed}-${tick}-${batch.batchId}`,
            timestamp: ts,
            config,
            siteId,
            orderId: batch.orderId,
            batchId: batch.batchId,
            payload: {
              schemaVersion: '1.0',
              batchId: batch.batchId,
              materialId: batch.materialId,
              orderId: batch.orderId,
              status: batch.status,
              goodQuantity: batch.goodQuantity,
              rejectQuantity: batch.rejectQuantity,
              role: batch.role,
            },
          },
          'batch-v1',
        ),
      );
    }

    // quality semantic events
    if (tick === 16 || (tick === 18 && !holdForever) || tick === 41) {
      const qType =
        tick === 16
          ? 'BATCH_ON_HOLD'
          : tick === 18
            ? 'BATCH_RELEASED'
            : 'FUNCTIONAL_TEST_FAILED';
      messages.push(
        msg(
          config,
          qualityTopic(config, siteId),
          'quality/events',
          {
            eventId: `EVT-${seed}-${tick}-quality`,
            timestamp: ts,
            config,
            siteId,
            batchId: tick === 41 ? 'AIB-260823-001' : 'DPB-260823-001',
            payload: {
              schemaVersion: '1.0',
              eventType: qType,
              batchId: tick === 41 ? 'AIB-260823-001' : 'DPB-260823-001',
              rejectQuantity: tick === 41 ? campaign.functionalRejected : undefined,
            },
          },
          'quality-event-v1',
        ),
      );
    }

    for (const hu of warehouse) {
      messages.push(
        msg(
          config,
          warehouseHuTopic(config, siteId, hu.huId),
          'warehouse/hu',
          {
            eventId: `EVT-${seed}-${tick}-${hu.huId}`,
            timestamp: ts,
            config,
            siteId,
            batchId: hu.batchId,
            payload: {
              schemaVersion: '1.0',
              huId: hu.huId,
              materialId: hu.material,
              batchId: hu.batchId ?? null,
              quantity: hu.quantity,
              uom: hu.uom ?? 'EA',
              qualityStatus: hu.qualityStatus ?? null,
              warehouse: hu.warehouse ?? hu.location,
              status: hu.status,
              location: hu.location,
              createdAt: hu.createdAt ?? ts,
            },
          },
          'handling-unit-v1',
        ),
      );
    }
  }

  // Equipment UNS state/counts still published by main engine loop;
  // return mutated equipment for that loop / override path.
  return {
    equipment,
    orders,
    warehouse,
    batches,
    genealogy,
    serials,
    campaign,
    messages,
  };
}

export function campaignValueStream(state: SimulationState) {
  const dp = state.orders.find(o => o.orderId === 'PO-DP-100001');
  const ai = state.orders.find(o => o.orderId === 'PO-AI-100002');
  const pkg = state.orders.find(o => o.orderId === 'PO-PKG-100003');
  const fgHus = (state.warehouse ?? []).filter(h => h.huId.startsWith('HU-FG'));
  return {
    productFamily: state.campaign?.productFamily ?? 'AUTOINJECTOR-100MG',
    phase: state.campaign?.phase ?? 'INIT',
    drugProduct: {
      orderId: dp?.orderId,
      batchId: dp?.batch,
      status: dp?.status,
      goodQuantity: dp?.goodQuantity ?? 0,
      rejectQuantity: dp?.rejectQuantity ?? 0,
    },
    assembly: {
      orderId: ai?.orderId,
      batchId: ai?.batch,
      status: ai?.status,
      goodQuantity: ai?.goodQuantity ?? 0,
      rejectQuantity: ai?.rejectQuantity ?? 0,
      blocked: state.campaign?.assemblyBlocked ?? false,
    },
    packaging: {
      orderId: pkg?.orderId,
      batchId: pkg?.batch,
      status: pkg?.status,
      goodQuantity: pkg?.goodQuantity ?? 0,
      blocked: state.campaign?.packagingBlocked ?? false,
    },
    finishedGoods: {
      warehouse: 'FG-WH-01',
      hus: fgHus,
      quantity: fgHus.reduce((s, h) => s + h.quantity, 0),
    },
    genealogy: state.genealogy ?? [],
    serialSample: state.serials ?? [],
  };
}
