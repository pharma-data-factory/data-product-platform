/**
 * `users.githubTeamSync` validation (NXD-108), and the guardrail NXD-107
 * puts on it: URS approval groups are never mirrored into GitHub.
 */

import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { parseGithubTeamSyncConfig } from './githubTeamSync';

const valid = {
  enabled: true,
  organization: 'pharma-data-factory',
  schedule: { frequency: { minutes: 15 } },
  teams: {
    'data-product-developers': 'nexora-developers',
    'platform-admins': 'nexora-admins',
  },
};

describe('parseGithubTeamSyncConfig', () => {
  it('is inert when the key is absent', () => {
    expect(parseGithubTeamSyncConfig(undefined)).toBeUndefined();
  });

  it('reads a valid mapping, one slug becoming a one-element list', () => {
    expect(parseGithubTeamSyncConfig(valid)).toEqual({
      ...valid,
      teams: {
        'data-product-developers': ['nexora-developers'],
        'platform-admins': ['nexora-admins'],
      },
    });
  });

  it('maps one group to several teams, trimmed and de-duplicated (NXD-112)', () => {
    expect(
      parseGithubTeamSyncConfig({
        ...valid,
        teams: {
          'platform-admins': [
            'nexora-admins',
            ' nexora-developers ',
            'nexora-admins',
          ],
        },
      })?.teams,
    ).toEqual({ 'platform-admins': ['nexora-admins', 'nexora-developers'] });
  });

  it.each([[[]], [['nexora-admins', '']], [['nexora-admins', 7]]])(
    'refuses an empty or invalid team list %j',
    list => {
      expect(() =>
        parseGithubTeamSyncConfig({
          ...valid,
          teams: { 'platform-admins': list },
        }),
      ).toThrow(/non-empty list/);
    },
  );

  it.each([
    ['urs-authors'],
    ['urs-business-reviewers'],
    ['urs-product-managers'],
    ['urs-quality-reviewers'],
    ['URS-Quality-Reviewers'],
  ])('refuses the approval group %s and names NXD-107', group => {
    expect(() =>
      parseGithubTeamSyncConfig({
        ...valid,
        teams: { ...valid.teams, [group]: 'nexora-qa' },
      }),
    ).toThrow(/approval groups must not be mirrored into GitHub \(NXD-107\)/);
  });

  it('refuses an approval group even while the sync is disabled', () => {
    // Wrong while switched off is still wrong the day it is switched on.
    expect(() =>
      parseGithubTeamSyncConfig({
        enabled: false,
        teams: { 'urs-quality-reviewers': 'nexora-qa' },
      }),
    ).toThrow(/urs-quality-reviewers/);
  });

  it('lists every offending group in one message', () => {
    expect(() =>
      parseGithubTeamSyncConfig({
        ...valid,
        teams: { 'urs-authors': 'a', 'urs-quality-reviewers': 'b' },
      }),
    ).toThrow(/urs-authors, urs-quality-reviewers/);
  });

  it('accepts enabled as the string an environment variable produces', () => {
    expect(
      parseGithubTeamSyncConfig({ ...valid, enabled: 'false' })?.enabled,
    ).toBe(false);
    expect(
      parseGithubTeamSyncConfig({ ...valid, enabled: 'true' })?.enabled,
    ).toBe(true);
  });

  it.each([
    [{ ...valid, enabled: 'yes' }, /enabled must be true or false/],
    [{ ...valid, organization: '' }, /organization is required/],
    [{ ...valid, teams: {} }, /teams is empty/],
    [
      { ...valid, teams: { 'platform-admins': '' } },
      /must be a GitHub team slug/,
    ],
    [{ ...valid, teams: ['nexora-admins'] }, /teams must map/],
    [{ ...valid, schedule: '15m' }, /schedule must be an object/],
    ['on', /expected an object/],
  ])('refuses invalid content %#', (raw, message) => {
    expect(() => parseGithubTeamSyncConfig(raw)).toThrow(message);
  });

  it('does not require organization or teams while disabled', () => {
    expect(parseGithubTeamSyncConfig({ enabled: false })).toEqual({
      enabled: false,
      organization: '',
      schedule: undefined,
      teams: {},
    });
  });

  it('ships a committed mapping that passes, disabled by default', () => {
    const file = path.resolve(__dirname, '../../../app-config.github.yaml');
    const raw = YAML.parse(fs.readFileSync(file, 'utf8')).users.githubTeamSync;
    // What the config loader makes of the substitutions when nothing is set.
    expect(raw.enabled).toBe('${GITHUB_TEAM_SYNC_ENABLED:-false}');
    expect(raw.organization).toBe('${GITHUB_ORG:-pharma-data-factory}');
    const parsed = parseGithubTeamSyncConfig({
      ...raw,
      enabled: 'false',
      organization: 'pharma-data-factory',
    });
    expect(parsed?.enabled).toBe(false);
    expect(Object.keys(parsed!.teams).some(g => g.startsWith('urs-'))).toBe(
      false,
    );
    // Weg 2: administrators are in every synced team.
    expect(parsed!.teams['platform-admins']).toEqual([
      'nexora-admins',
      'nexora-developers',
      'nexora-owners',
    ]);
  });
});
