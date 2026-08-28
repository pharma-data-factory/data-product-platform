import { render, screen } from '@testing-library/react';
import { ModelCompanySection } from './ModelCompanySection';

describe('ModelCompanySection', () => {
  it('renders landing card with primary CTA to /model-company', () => {
    render(<ModelCompanySection />);
    expect(
      screen.getByRole('heading', { name: 'Nexora Model Pharma' }),
    ).toBeInTheDocument();
    expect(screen.getByText('NON-GXP')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /OPEN MODEL COMPANY/i }),
    ).toHaveAttribute('href', '/model-company');
    expect(
      screen.getByRole('link', { name: /Open Campaign/i }),
    ).toHaveAttribute('href', '/model-company/campaign');
    expect(screen.getByText('SYNTHETIC')).toBeInTheDocument();
    expect(screen.getByText('UNS-NATIVE')).toBeInTheDocument();
    expect(
      screen.getByText(/Autoinjector Drug Product → Assembly → Packaging → Finished Goods/i),
    ).toBeInTheDocument();
  });
});
