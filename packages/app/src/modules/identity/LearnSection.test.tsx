import { render, screen, within } from '@testing-library/react';
import {
  LEARN_ASSEMBLY_EXAMPLES,
  LEARN_ASSEMBLY_STEPS,
  LEARN_TOPICS,
} from '@internal/platform-common';
import { LearnSection } from './LearnSection';

describe('Learn section', () => {
  it('explains Data Products in short business language', () => {
    render(<LearnSection />);

    expect(screen.getByLabelText('Learn')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Data Products, in business terms' }),
    ).toBeInTheDocument();
    for (const topic of LEARN_TOPICS) {
      const card = document.getElementById(`learn-${topic.id}`);
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText(topic.title)).toBeInTheDocument();
      expect(within(card as HTMLElement).getByText(topic.summary)).toBeInTheDocument();
    }
  });

  it('shows a high-level assembly flow for available products only', () => {
    render(<LearnSection />);
    const diagram = screen.getByLabelText(
      /How Data Products are assembled from reusable capabilities/i,
    );

    for (const step of LEARN_ASSEMBLY_STEPS) {
      expect(within(diagram).getByText(step)).toBeInTheDocument();
    }
    for (const example of LEARN_ASSEMBLY_EXAMPLES) {
      expect(within(diagram).getByText(example)).toBeInTheDocument();
    }
    expect(screen.queryByText('OEE')).not.toBeInTheDocument();
    expect(screen.queryByText(/MQTT Consumer/i)).not.toBeInTheDocument();
  });

  it('uses native diagram styling rather than a Mermaid runtime', () => {
    const { container } = render(<LearnSection />);

    expect(container.querySelectorAll('.pdf-diag').length).toBe(1);
    expect(container.querySelector('.mermaid')).toBeNull();
  });
});
