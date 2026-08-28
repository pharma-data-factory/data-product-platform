import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  autoinjectorLikeFixture,
  minimalFactoryFixture,
} from '../../__fixtures__/factories';
import { normalizeFactory } from '../../factoryModel';
import {
  buildFactoryValueStream,
  getEquipmentIcon,
  resolveEquipmentIconKind,
  resolveOeeProductName,
} from './index';
import { ValueStreamCanvas } from './ValueStreamCanvas';
import { CheckweigherIcon, CompoundingIcon } from './equipmentIcons';

describe('Static vs Dynamic Verification', () => {
  it('maps icons by equipment.type only (STATIC SVG, DYNAMIC type)', () => {
    expect(resolveEquipmentIconKind('CHECKWEIGHER-01')).toBe('generic');
    expect(resolveEquipmentIconKind('checkweigher')).toBe('checkweigher');
    expect(getEquipmentIcon('checkweigher')).toBe(CheckweigherIcon);
    expect(getEquipmentIcon('compounder')).toBe(CompoundingIcon);
    expect(getEquipmentIcon('unknown-widget')).not.toBe(CheckweigherIcon);
  });

  it('never resolves OEE product name from equipment id alone', () => {
    expect(resolveOeeProductName('CHECKWEIGHER-01')).toBeUndefined();
    expect(resolveOeeProductName('CHECKWEIGHER-01', 'checkweigher')).toBe(
      'checkweigher-oee',
    );
  });

  it('changes equipment status when runtime changes (DYNAMIC)', () => {
    const sites = normalizeFactory(autoinjectorLikeFixture);
    const a = buildFactoryValueStream({
      factory: autoinjectorLikeFixture,
      sites,
      runtimeById: {
        'CHECKWEIGHER-01': { state: 'RUNNING', goodCount: 1000, rejectCount: 2 },
      },
      orders: [],
      batches: [],
      warehouse: [],
    });
    const b = buildFactoryValueStream({
      factory: autoinjectorLikeFixture,
      sites,
      runtimeById: {
        'CHECKWEIGHER-01': {
          state: 'MICROSTOP',
          reasonCode: 'PRODUCT_JAM',
          goodCount: 31840,
          rejectCount: 184,
        },
      },
      orders: [],
      batches: [],
      warehouse: [],
    });
    const eqA = a.equipment.find(e => e.id === 'CHECKWEIGHER-01');
    const eqB = b.equipment.find(e => e.id === 'CHECKWEIGHER-01');
    expect(eqA?.status).toBe('RUNNING');
    expect(eqB?.status).toBe('MICROSTOP');
    expect(eqB?.reasonCode).toBe('PRODUCT_JAM');
    expect(eqA?.iconKind).toBe(eqB?.iconKind);
  });

  it('interrupts material feeder path when runtime reports MATERIAL_STARVED', () => {
    const sites = normalizeFactory(autoinjectorLikeFixture);
    // Ensure packaging types that infer carton supply exist
    const factory = {
      ...autoinjectorLikeFixture,
      sites: [
        {
          ...autoinjectorLikeFixture.sites![0],
          areas: [
            {
              id: 'PACKAGING',
              name: 'Final Packaging',
              lines: [
                {
                  id: 'PKG-L01',
                  name: 'Final Packaging Line',
                  areaId: 'PACKAGING',
                  siteId: 'MODEL-PHARMA-01',
                  equipment: [
                    {
                      id: 'CARTONER-01',
                      type: 'cartoner',
                      lineId: 'PKG-L01',
                      areaId: 'PACKAGING',
                      siteId: 'MODEL-PHARMA-01',
                    },
                    {
                      id: 'CHECKWEIGHER-01',
                      type: 'checkweigher',
                      lineId: 'PKG-L01',
                      areaId: 'PACKAGING',
                      siteId: 'MODEL-PHARMA-01',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const sitesPkg = normalizeFactory(factory);
    const starved = buildFactoryValueStream({
      factory,
      sites: sitesPkg,
      runtimeById: {
        'CARTONER-01': { state: 'MATERIAL_STARVED', reasonCode: 'CARTON_LOW' },
        'CHECKWEIGHER-01': { state: 'IDLE' },
      },
      orders: [],
      batches: [],
      warehouse: [],
    });
    const cartonSupply = starved.materials.find(m => m.id === 'supply-cartons');
    const materialEdge = starved.flows.find(
      f => f.flowType === 'material' && f.source === 'supply-cartons',
    );
    expect(cartonSupply?.status).toBe('MATERIAL_STARVED');
    expect(materialEdge?.interrupted).toBe(true);
    expect(sites).toBeTruthy();
  });

  it('renders the same engine for minimalFactoryFixture (no Autoinjector React branch)', () => {
    const vs = buildFactoryValueStream({
      factory: minimalFactoryFixture,
      runtimeById: {
        'EQ-01': { state: 'RUNNING', goodCount: 10 },
        'EQ-02': { state: 'IDLE' },
      },
      orders: [
        {
          orderId: 'ORD-MIN-1',
          lineId: 'LINE-A1',
          material: 'MAT-1',
          batch: 'B-MIN-1',
          status: 'RUNNING',
          goodQuantity: 10,
          targetQuantity: 100,
          rejectQuantity: 0,
        },
      ],
      batches: [
        {
          batchId: 'B-MIN-1',
          status: 'RUNNING',
          materialId: 'MAT-1',
          orderId: 'ORD-MIN-1',
          goodQuantity: 10,
        },
      ],
      warehouse: [],
    });
    expect(vs.stages.length).toBe(1);
    expect(vs.equipment.map(e => e.id).sort()).toEqual(['EQ-01', 'EQ-02']);
    expect(vs.kpis.produced).toBe(10);
    expect(vs.handlingUnits.aggregateLabel).toBe('AWAITING RECEIPT');
    expect(vs.batches[0]?.batchId).toBe('B-MIN-1');

    render(
      <MemoryRouter>
        <ValueStreamCanvas lanes={vs.stages} />
      </MemoryRouter>,
    );
    expect(screen.getByText('EQ-01')).toBeInTheDocument();
    expect(screen.queryByText(/CHECKWEIGHER-01/i)).not.toBeInTheDocument();
  });

  it('updates KPI quantities from runtime/orders (no hardcoded demo counts)', () => {
    const base = {
      factory: minimalFactoryFixture,
      runtimeById: {},
      batches: [] as [],
      warehouse: [] as [],
    };
    const s1 = buildFactoryValueStream({
      ...base,
      orders: [
        {
          orderId: 'O1',
          lineId: 'LINE-A1',
          material: 'M',
          batch: 'B1',
          status: 'RUNNING',
          goodQuantity: 100,
          targetQuantity: 500,
          rejectQuantity: 3,
        },
      ],
    });
    const s2 = buildFactoryValueStream({
      ...base,
      orders: [
        {
          orderId: 'O1',
          lineId: 'LINE-A1',
          material: 'M',
          batch: 'B1',
          status: 'RUNNING',
          goodQuantity: 250,
          targetQuantity: 500,
          rejectQuantity: 5,
        },
      ],
    });
    expect(s1.kpis.produced).toBe(100);
    expect(s2.kpis.produced).toBe(250);
    expect(s1.kpis.produced).not.toBe(s2.kpis.produced);
  });
});
