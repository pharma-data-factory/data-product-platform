/**
 * NXD-154. Which coding agents the AI build offers comes from configuration:
 * Claude Code unless switched off, Codex only when switched on, and a default
 * that must be one of them.
 */

import { ConfigReader } from '@backstage/config';
import {
  DEFAULT_AI_BUILD_CODEX_MODEL,
  DEFAULT_AI_BUILD_MODEL,
  readAiBuildAgents,
} from './plugin';

const read = (aiBuild: object) =>
  readAiBuildAgents(
    new ConfigReader({ composer: { aiBuild: { enabled: true, ...aiBuild } } }),
  );

describe('readAiBuildAgents (NXD-154)', () => {
  it('offers Claude Code alone by default, and keeps composer.aiBuild.model as its model', () => {
    expect(read({})).toEqual({
      agents: { 'claude-code': { model: DEFAULT_AI_BUILD_MODEL } },
      defaultAgent: 'claude-code',
    });
    expect(read({ model: 'claude-sonnet-5-5' }).agents['claude-code']).toEqual({
      model: 'claude-sonnet-5-5',
    });
  });

  it('offers Codex when enabled, and either agent as the default', () => {
    expect(read({ agents: { codex: { enabled: true } } })).toEqual({
      agents: {
        'claude-code': { model: DEFAULT_AI_BUILD_MODEL },
        codex: { model: DEFAULT_AI_BUILD_CODEX_MODEL },
      },
      defaultAgent: 'claude-code',
    });
    expect(
      read({
        defaultAgent: 'codex',
        agents: {
          'claude-code': { enabled: false },
          codex: { enabled: 'true', model: 'gpt-6-luna' },
        },
      }),
    ).toEqual({
      agents: { codex: { model: 'gpt-6-luna' } },
      defaultAgent: 'codex',
    });
  });

  it('refuses a default that is not offered, and an AI build that offers nothing', () => {
    expect(() => read({ defaultAgent: 'codex' })).toThrow(
      'composer.aiBuild.defaultAgent is codex, which is not enabled; enabled: claude-code',
    );
    expect(() =>
      read({ agents: { 'claude-code': { enabled: false } } }),
    ).toThrow('offers no agent');
  });
});
