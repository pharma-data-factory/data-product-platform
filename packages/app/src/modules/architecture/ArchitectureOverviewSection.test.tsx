import { render, screen } from '@testing-library/react';
import { ArchitectureOverviewSection } from './ArchitectureOverviewSection';
import {
  ARCHITECTURE_OVERVIEW_IMAGE_ALT,
  ARCHITECTURE_OVERVIEW_IMAGE_SRC,
  ARCHITECTURE_PATH,
  isDeveloperArchitecturePath,
  isPublicArchitecturePath,
} from './constants';

describe('ArchitectureOverviewSection', () => {
  it('renders the landing architecture overview after the principle story', () => {
    render(<ArchitectureOverviewSection />);

    expect(screen.getByLabelText('Architecture overview')).toBeInTheDocument();
    expect(screen.getByText('FROM PRINCIPLE TO ARCHITECTURE')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'How Pharma Data Factory works' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/governed engineering layer for building/i),
    ).toBeInTheDocument();
    expect(screen.getByText('STANDARD CORE')).toBeInTheDocument();
    expect(screen.getByText('GOVERNED INTEGRATION')).toBeInTheDocument();
    expect(screen.getByText('INDEPENDENT DATA PRODUCTS')).toBeInTheDocument();
  });

  it('uses the supplied architecture image with lazy loading and alt text', () => {
    render(<ArchitectureOverviewSection />);
    const image = screen.getByRole('img', {
      name: ARCHITECTURE_OVERVIEW_IMAGE_ALT,
    });

    expect(image).toHaveAttribute('src', ARCHITECTURE_OVERVIEW_IMAGE_SRC);
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).toHaveStyle({ width: '100%', height: 'auto' });
  });

  it('navigates to the architecture page from the CTA', () => {
    render(<ArchitectureOverviewSection />);
    expect(
      screen.getByRole('link', { name: 'Explore the Architecture' }),
    ).toHaveAttribute('href', ARCHITECTURE_PATH);
  });
});

describe('architecture route helper', () => {
  it('recognizes the public architecture path', () => {
    expect(isPublicArchitecturePath('/platform/architecture')).toBe(true);
    expect(isPublicArchitecturePath('/platform/architecture/')).toBe(true);
    expect(isPublicArchitecturePath('/platform/architecture/developer')).toBe(true);
    expect(isPublicArchitecturePath('/')).toBe(false);
    expect(isPublicArchitecturePath('/catalog')).toBe(false);
    expect(isDeveloperArchitecturePath('/platform/architecture/developer')).toBe(true);
    expect(isDeveloperArchitecturePath('/platform/architecture')).toBe(false);
  });
});
