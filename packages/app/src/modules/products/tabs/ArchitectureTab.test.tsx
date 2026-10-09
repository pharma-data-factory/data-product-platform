/**
 * NXD-157. The Architecture tab names what a component is and what it
 * implements, shows links by name rather than id, and offers removal while
 * the version is DRAFT, after asking.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArchitectureTab, componentDetails } from './ArchitectureTab';

const DRAFT: any = { id: 'v1', version: '1.0', status: 'DRAFT' };
const COMPONENT: any = {
  id: 'c1',
  productVersionId: 'v1',
  componentType: 'INPUT_PORT',
  name: 'event-ingestion',
  ref: 'app/ingest.py',
  interfaceType: 'MQTT',
  createdBy: 'user:default/demo-author',
  createdAt: '2026-10-09T19:40:00Z',
};
const REQUIREMENTS: any[] = [
  {
    id: 'r3',
    requirementRef: 'URS-EPM-003',
    title: 'Equipment event ingestion',
  },
];
const TRACEABILITY: any = {
  productId: 'p1',
  componentCount: 1,
  coveredComponentCount: 1,
  coverage: 1,
  links: [
    {
      id: 'l1',
      sourceType: 'URS_REQUIREMENT_VERSION',
      sourceId: 'URS-EPM-003',
      relationshipType: 'IMPLEMENTS',
      targetType: 'PRODUCT_COMPONENT',
      targetId: 'c1',
    },
    // Another version's component: not this version's link.
    {
      id: 'l2',
      sourceType: 'URS_REQUIREMENT_VERSION',
      sourceId: 'URS-EPM-001',
      relationshipType: 'IMPLEMENTS',
      targetType: 'PRODUCT_COMPONENT',
      targetId: 'c-other',
    },
  ],
};

const renderTab = (props: Record<string, unknown> = {}) =>
  render(
    <ArchitectureTab
      selectedVersion={DRAFT}
      components={[COMPONENT]}
      requirements={REQUIREMENTS}
      traceability={TRACEABILITY}
      onAddComponent={jest.fn()}
      onAddLink={jest.fn()}
      {...props}
    />,
  );

describe('ArchitectureTab (NXD-157)', () => {
  it('says what a component is, who added it, and what it implements, by name', () => {
    expect(componentDetails(COMPONENT)).toEqual([
      'Interface MQTT · Ref app/ingest.py · added by user:default/demo-author on 2026-10-09',
    ]);
    renderTab();
    // Once in the type picker, once as the card's chip.
    expect(screen.getAllByText('INPUT_PORT')).toHaveLength(2);
    expect(
      screen.getByText('Implements URS-EPM-003 Equipment event ingestion'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /URS-EPM-003 Equipment event ingestion —IMPLEMENTS→ event-ingestion/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/c-other/)).not.toBeInTheDocument();
  });

  it('removes a component or a link only after it is confirmed in place', () => {
    const onRemoveComponent = jest.fn(async () => {});
    const onRemoveLink = jest.fn(async () => {});
    renderTab({ onRemoveComponent, onRemoveLink });

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove event-ingestion' }),
    );
    expect(
      screen.getByText(
        'Remove event-ingestion and its 1 traceability link? The removal is recorded in the audit trail.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRemoveComponent).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove event-ingestion' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    expect(onRemoveComponent).toHaveBeenCalledWith('c1');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove link URS-EPM-003 Equipment event ingestion to event-ingestion',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    expect(onRemoveLink).toHaveBeenCalledWith('l1');
  });

  it('offers no removal once the version has left DRAFT', () => {
    renderTab({
      selectedVersion: { ...DRAFT, status: 'APPROVED' },
      onRemoveComponent: jest.fn(),
      onRemoveLink: jest.fn(),
    });
    expect(
      screen.queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
  });
});
