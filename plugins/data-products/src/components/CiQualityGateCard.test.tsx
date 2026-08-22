import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { CiQualityGateView } from './CiQualityGateCard';
import { QualityAndContractCard } from './QualityAndContractCard';
import { DataProduct } from '../model';
import { CiStatusChip } from './CiStatusChip';

const product: DataProduct = {
  name: 'cold-room-temperature',
  title: 'Cold Room Temperature',
  description: 'MQTT temperature product',
  owner: 'guests',
  version: '1.0.0',
  lifecycle: 'experimental',
  domain: 'manufacturing',
  sourceSystems: ['mqtt'],
  interfaces: ['REST'],
  apis: ['cold-room-temperature--temperature-event'],
  dataContracts: [],
  dataContractVersion: '1.1.0',
  qualityStatus: 'TESTED',
  requiredChecks: ['lint', 'test'],
  compatibleVersions: [],
  dependsOn: [],
  usedBy: [],
  compatibilityStatus: 'UNKNOWN',
  dependencies: [],
  certificationStatus: 'DEVELOPMENT',
  entityRef: 'component:default/cold-room-temperature',
};

describe('CI Quality Gate UI', () => {
  it('renders a passed GitHub Actions result', () => {
    render(
      <MemoryRouter>
        <CiQualityGateView
          status={{
            status: 'PASSED',
            workflowName: 'CI',
            branch: 'main',
            commitSha: 'a82f921',
            completedAt: '2026-08-17T06:05:00Z',
            htmlUrl:
              'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/42',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('CI Quality Gate')).toBeInTheDocument();
    expect(screen.getByText('PASSED')).toBeInTheDocument();
    expect(screen.getByText('CI')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('a82f921')).toBeInTheDocument();
    expect(screen.getByText('View in GitHub')).toHaveAttribute(
      'href',
      'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/42',
    );
    expect(screen.getByText('CI troubleshooting guide')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/how-to/ci-failure',
    );
    expect(
      screen.getByText(/not GxP or regulatory validation/i),
    ).toBeInTheDocument();
  });

  it('renders failed quality stages', () => {
    render(
      <MemoryRouter>
        <CiQualityGateView
          status={{
            status: 'FAILED',
            workflowName: 'CI',
            failedStages: ['Lint', 'Unit Tests'],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Lint')).toBeInTheDocument();
    expect(screen.getByText('Unit Tests')).toBeInTheDocument();
  });

  it('renders UNKNOWN as DEGRADED / UNVERIFIED and never as PASSED', () => {
    render(
      <MemoryRouter>
        <CiQualityGateView
          status={{ status: 'UNKNOWN', message: 'Not available' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('DEGRADED / UNVERIFIED')).toBeInTheDocument();
    expect(screen.queryByText('PASSED')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
  });

  it.each(['RUNNING', 'PASSED', 'FAILED', 'CANCELLED'] as const)(
    'renders the %s CI badge',
    status => {
      render(<CiStatusChip status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
    },
  );

  it('renders the UNKNOWN CI badge as DEGRADED / UNVERIFIED', () => {
    render(<CiStatusChip status="UNKNOWN" />);
    expect(screen.getByText('DEGRADED / UNVERIFIED')).toBeInTheDocument();
  });
});

describe('Quality & Contract card', () => {
  it('no longer shows the Last CI Result placeholder', () => {
    render(
      <MemoryRouter>
        <QualityAndContractCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Last CI Result')).not.toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
    expect(screen.getByText('Contract documentation')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/engineering/contracts',
    );
  });
});
