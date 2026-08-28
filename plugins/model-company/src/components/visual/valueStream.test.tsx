import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  autoinjectorLikeFixture,
  minimalFactoryFixture,
} from '../../__fixtures__/factories';
import { normalizeFactory } from '../../factoryModel';
import {
  buildValueStreamLanes,
  collectActiveAlerts,
  isFlowInterrupted,
  isOperationalWarning,
  resolveEquipmentIconKind,
} from './index';
import { ValueStreamCanvas } from './ValueStreamCanvas';
import { EquipmentTypeIcon } from './equipmentIcons';

describe('value stream graph (config-driven)', () => {
  it('builds lanes from factory areas without hard-coded Autoinjector-only assumptions', () => {
    const sites = normalizeFactory(autoinjectorLikeFixture);
    const areas = sites[0]?.areas ?? [];
    const lanes = buildValueStreamLanes(
      areas,
      { 'CHECKWEIGHER-01': { state: 'MICROSTOP', reasonCode: 'PRODUCT_JAM' } },
      [],
    );
    expect(lanes.length).toBeGreaterThan(0);
    expect(lanes[0].equipment.length).toBeGreaterThan(0);
  });

  it('renders ValueStreamCanvas for minimal factory without Autoinjector ids', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    const lanes = buildValueStreamLanes(
      sites[0].areas,
      {
        'EQ-01': { state: 'RUNNING', goodCount: 10 },
        'EQ-02': { state: 'IDLE' },
      },
      [],
    );
    render(
      <MemoryRouter>
        <ValueStreamCanvas lanes={lanes} />
      </MemoryRouter>,
    );
    expect(
      screen.getByLabelText(/pharma manufacturing value stream/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/CHECKWEIGHER-01/i)).not.toBeInTheDocument();
  });

  it('selects icons by equipment.type metadata', () => {
    expect(resolveEquipmentIconKind('checkweigher')).toBe('checkweigher');
    expect(resolveEquipmentIconKind('cartoner')).toBe('cartoner');
    expect(resolveEquipmentIconKind('compounder')).toBe('compounding');
    expect(resolveEquipmentIconKind('device-assembler')).toBe('assembly');
    render(<EquipmentTypeIcon equipmentType="labeler" title="labeler" />);
    expect(screen.getByRole('img', { name: 'labeler' })).toBeInTheDocument();
  });

  it('marks MICROSTOP as warning and MATERIAL_STARVED as interrupted', () => {
    expect(isOperationalWarning('MICROSTOP')).toBe(true);
    expect(isFlowInterrupted('MATERIAL_STARVED')).toBe(true);
    expect(isFlowInterrupted('QUALITY_HOLD')).toBe(true);
    expect(isFlowInterrupted('RUNNING')).toBe(false);
  });

  it('collects alerts from runtime without fabricating decorative events', () => {
    const sites = normalizeFactory(autoinjectorLikeFixture);
    const alerts = collectActiveAlerts(sites, {
      'CHECKWEIGHER-01': { state: 'MICROSTOP', reasonCode: 'PRODUCT_JAM' },
    });
    expect(alerts.some(a => a.status === 'MICROSTOP')).toBe(true);
    expect(alerts.every(a => a.equipmentId && a.status)).toBe(true);
  });
});
