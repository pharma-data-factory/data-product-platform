import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LegalPage } from './LegalPage';
import { isPublicLegalPath } from './constants';

describe('legal placeholder routes', () => {
  it('labels counsel-review placeholders and does not present them as final terms', () => {
    render(
      <MemoryRouter>
        <LegalPage pathname="/privacy" standalone />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/REVIEW PLACEHOLDER/).length).toBeGreaterThan(0);
    expect(screen.getByText(/privacy statement/i)).toBeInTheDocument();
  });

  it('recognizes public legal paths', () => {
    expect(isPublicLegalPath('/legal')).toBe(true);
    expect(isPublicLegalPath('/open-source')).toBe(true);
    expect(isPublicLegalPath('/marketplace')).toBe(false);
  });
});
