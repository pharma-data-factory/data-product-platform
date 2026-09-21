import {
  AnthropicComposerLLMClient,
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

describe('AnthropicComposerLLMClient parsing', () => {
  /**
   * Wraps a text string in the Anthropic Messages API response envelope.
   * Content may contain thinking blocks (Opus 5) before the text block;
   * the client must skip them and find the first text block.
   */
  function anthropicEnvelope(text: string, includeThinkingBlock = false): object {
    const content: object[] = [];
    if (includeThinkingBlock) {
      content.push({ type: 'thinking', thinking: 'Let me reason about this...' });
    }
    content.push({ type: 'text', text });
    return { id: 'msg_test', type: 'message', role: 'assistant', content, stop_reason: 'end_turn' };
  }

  function createClientWithMockFetch(
    responseText: string,
    status = 200,
    includeThinkingBlock = false,
  ) {
    const envelope = anthropicEnvelope(responseText, includeThinkingBlock);
    const mockFetch = jest.fn().mockResolvedValue({
      ok: status === 200,
      status,
      text: () => Promise.resolve(JSON.stringify(envelope)),
      json: () => Promise.resolve(envelope),
    });
    return new AnthropicComposerLLMClient({
      apiKey: 'test-key',
      model: 'claude-haiku-4-5',
      fetchApi: mockFetch as unknown as typeof fetch,
    });
  }

  it('sends x-api-key and anthropic-version headers', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(anthropicEnvelope(JSON.stringify({ suggestions: [] }))),
    });
    const client = new AnthropicComposerLLMClient({
      apiKey: 'sk-ant-test',
      model: 'claude-haiku-4-5',
      fetchApi: mockFetch as unknown as typeof fetch,
    });

    await client.suggestComponents(sampleContext, 'system prompt');

    const [url, init] = (mockFetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('parses valid JSON suggestions from Anthropic response', async () => {
    const suggestions = JSON.stringify({
      suggestions: [
        { name: 'time-series-storage', reason: 'Needed for sensor data', priority: 'required' },
        { name: 'rest-api', reason: 'Expose to consumers', priority: 'recommended' },
      ],
    });
    const client = createClientWithMockFetch(suggestions);
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('time-series-storage');
    expect(results[0].priority).toBe('required');
  });

  it('skips thinking blocks and extracts the text block', async () => {
    const suggestions = JSON.stringify({
      suggestions: [{ name: 'health-check', reason: 'Required', priority: 'required' }],
    });
    // Response includes a thinking block before the text block (Opus 5 behaviour)
    const client = createClientWithMockFetch(suggestions, 200, true);
    const results = await client.suggestComponents(sampleContext, 'system prompt');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('health-check');
  });

  it('throws on Anthropic API error status', async () => {
    const client = createClientWithMockFetch('', 429);
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'Anthropic API error (429)',
    );
  });

  it('throws when content array has no text block', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ content: [{ type: 'thinking', thinking: 'only thinking, no text' }] }),
    });
    const client = new AnthropicComposerLLMClient({
      apiKey: 'key',
      model: 'claude-haiku-4-5',
      fetchApi: mockFetch as unknown as typeof fetch,
    });
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'Anthropic API returned empty text response',
    );
  });

  it('throws on non-JSON text block content', async () => {
    const client = createClientWithMockFetch('not json at all');
    await expect(client.suggestComponents(sampleContext, 'prompt')).rejects.toThrow(
      'LLM response is not valid JSON',
    );
  });
});
