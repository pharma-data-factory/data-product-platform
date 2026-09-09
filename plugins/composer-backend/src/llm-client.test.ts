import {
  MockComposerLLMClient,
  OpenAIComposerLLMClient,
  ComponentSuggestionContext,
} from './llm-client';

const sampleContext: ComponentSuggestionContext = {
  productName: 'oee-monitor',
  description: 'Real-time OEE monitoring for filling line',
  domain: 'manufacturing',
  existingSelections: ['mqtt-consumer'],
  availableComponents: [
    { name: 'mqtt-consumer', title: 'MQTT Consumer', category: 'INPUT_PORT', purpose: 'Ingest MQTT telemetry', certificationStatus: 'CERTIFIED' },
    { name: 'time-series-storage', title: 'Time-Series Storage', category: 'DATA_STORAGE', purpose: 'Persist time-series data', certificationStatus: 'CERTIFIED' },
    { name: 'health-check', title: 'Health Check', category: 'OBSERVABILITY', purpose: 'Runtime health monitoring', certificationStatus: 'CERTIFIED' },
    { name: 'rest-api', title: 'REST API', category: 'OUTPUT_PORT', purpose: 'Expose data via REST', certificationStatus: 'CERTIFIED' },
  ],
};

describe('MockComposerLLMClient', () => {
  it('returns suggestions from available components excluding existing selections', async () => {
    const client = new MockComposerLLMClient();
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.every(r => r.name !== 'mqtt-consumer')).toBe(true);
    expect(results.every(r => ['required', 'recommended', 'optional'].includes(r.priority))).toBe(true);
  });

  it('returns empty array when no components are available', async () => {
    const client = new MockComposerLLMClient();
    const context: ComponentSuggestionContext = {
      ...sampleContext,
      existingSelections: sampleContext.availableComponents.map(c => c.name),
    };
    const results = await client.suggestComponents(context, 'system prompt');
    expect(results).toEqual([]);
  });
});

describe('OpenAIComposerLLMClient parsing', () => {
  function createClientWithMockFetch(mockResponse: string, status = 200) {
    // The client reads the model's answer out of the chat-completions
    // envelope. The mock used to return the answer as the whole body, so
    // choices[0].message.content was undefined and every parsing case failed
    // with "LLM returned empty response" before reaching the parser it was
    // meant to exercise.
    const envelope = {
      choices: [{ message: { content: mockResponse } }],
    };
    const mockFetch = jest.fn().mockResolvedValue({
      ok: status === 200,
      status,
      text: () => Promise.resolve(JSON.stringify(envelope)),
      json: () => Promise.resolve(envelope),
    });
    return new OpenAIComposerLLMClient({
      baseUrl: 'https://test.api',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      fetchApi: mockFetch as unknown as typeof fetch,
    });
  }

  it('parses valid JSON response with suggestions array', async () => {
    const response = JSON.stringify({
      suggestions: [
        { name: 'time-series-storage', reason: 'Needed for sensor data', priority: 'required' },
        { name: 'rest-api', reason: 'Expose to consumers', priority: 'recommended' },
      ],
    });
    const client = createClientWithMockFetch(response);
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('time-series-storage');
    expect(results[0].priority).toBe('required');
    expect(results[1].priority).toBe('recommended');
  });

  it('defaults invalid priority to recommended', async () => {
    const response = JSON.stringify({
      suggestions: [
        { name: 'health-check', reason: 'Monitoring', priority: 'invalid-value' },
      ],
    });
    const client = createClientWithMockFetch(response);
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results).toHaveLength(1);
    expect(results[0].priority).toBe('recommended');
  });

  it('skips items missing required fields', async () => {
    const response = JSON.stringify({
      suggestions: [
        { name: 'health-check', reason: 'Monitoring', priority: 'required' },
        { name: 'missing-reason' },
        { reason: 'no name field' },
      ],
    });
    const client = createClientWithMockFetch(response);
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('health-check');
  });

  it('throws on non-JSON response', async () => {
    const client = createClientWithMockFetch('not json at all');
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'LLM response is not valid JSON',
    );
  });

  it('throws when suggestions array is missing', async () => {
    const client = createClientWithMockFetch(JSON.stringify({ data: [] }));
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'LLM response missing "suggestions" array',
    );
  });

  it('throws on API error status', async () => {
    const client = createClientWithMockFetch('rate limited', 429);
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'LLM API error (429)',
    );
  });
});
