import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ValidationTab, validationContextHref } from './ValidationTab';

const COVERAGE: any = {
  productVersionId: 'v1',
  total: 1,
  mapped: 1,
  unmapped: 0,
  verified: 1,
  validated: 1,
  validationContextId: 'VALIDATION-CTX-1',
  byRequirement: [
    {
      requirementRef: 'URS-EPM-001',
      ursRequirementVersionId: 'r1',
      title: 'OEE calculation',
      validated: true,
    },
  ],
};

describe('ValidationTab (NXD-162)', () => {
  it('links to the decision of the selected version', () => {
    render(
      <MemoryRouter>
        <ValidationTab
          coverage={COVERAGE}
          selectedVersion={{ id: 'v 1', version: '1.0' } as any}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', {
        name: 'Open the validation decision for version 1.0',
      }),
    ).toHaveAttribute(
      'href',
      '/validation-expert/contexts/VALIDATION-CTX-1?version=v%201',
    );
  });

  it('opens the context without a version when none is selected', () => {
    expect(validationContextHref('VALIDATION-CTX-1')).toBe(
      '/validation-expert/contexts/VALIDATION-CTX-1',
    );
  });
});
