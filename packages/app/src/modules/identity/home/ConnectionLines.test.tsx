import { render } from '@testing-library/react';
import { ConnectionLines } from './ConnectionLines';

describe('ConnectionLines', () => {
  it('renders a data-flow stroke and packets on each architecture path', () => {
    const { container } = render(<ConnectionLines active={null} />);

    expect(container.querySelectorAll('.nx-flow').length).toBe(11);
    expect(container.querySelectorAll('.nx-flow-dash').length).toBe(11);
    expect(container.querySelectorAll('.nx-flow-packet').length).toBe(22);
    expect(container.querySelectorAll('animateMotion').length).toBe(22);
  });

  it('emphasizes the hovered connection', () => {
    const { container } = render(<ConnectionLines active="mqtt" />);
    const mqtt = container.querySelector('.mqtt');

    expect(mqtt).toHaveClass('nx-flow-strong');
    expect(container.querySelector('.erp')).toHaveClass('nx-flow-off');
  });
});
