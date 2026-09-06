import { buildSystemPrompt } from './prompt-template';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('contains GxP Data Platform architect role', () => {
    expect(prompt).toContain('GxP Data Platform architect');
  });

  it('contains life sciences manufacturing context', () => {
    expect(prompt).toContain('life sciences manufacturing');
  });

  it('includes priority guidance', () => {
    expect(prompt).toContain('required');
    expect(prompt).toContain('recommended');
    expect(prompt).toContain('optional');
  });

  it('includes few-shot examples', () => {
    expect(prompt).toContain('mqtt-consumer');
    expect(prompt).toContain('time-series-storage');
    expect(prompt).toContain('health-check');
  });

  it('instructs JSON output format', () => {
    expect(prompt).toContain('"suggestions"');
    expect(prompt).toContain('JSON object');
  });

  it('mentions GxP compliance considerations', () => {
    expect(prompt).toContain('GxP compliance');
  });
});
