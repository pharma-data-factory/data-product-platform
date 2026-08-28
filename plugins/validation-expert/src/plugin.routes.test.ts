import fs from 'fs';
import path from 'path';
import { validationExpertPlugin } from './plugin';
import { OVERVIEW_CARD_LINKS } from './components/OverviewPage';

describe('validationExpertPlugin routes', () => {
  it('exposes route refs for all dashboard destinations', () => {
    const routeKeys = Object.keys(validationExpertPlugin.routes ?? {});
    expect(routeKeys).toEqual(
      expect.arrayContaining([
        'root',
        'requirements',
        'traceability',
        'risks',
        'iq',
        'oq',
        'uat',
        'evidence',
        'findings',
      ]),
    );
  });

  it('registers PageBlueprint paths for every overview card destination', () => {
    const pluginSource = fs.readFileSync(
      path.join(__dirname, 'plugin.tsx'),
      'utf8',
    );

    for (const card of OVERVIEW_CARD_LINKS) {
      expect(pluginSource).toContain(`path: '${card.to}'`);
    }
  });

  it('maps every overview card link to the expected route', () => {
    expect(OVERVIEW_CARD_LINKS.map(card => card.to)).toEqual([
      '/validation-expert/requirements',
      '/validation-expert/traceability',
      '/validation-expert/iq',
      '/validation-expert/oq',
      '/validation-expert/uat',
      '/validation-expert/risks',
      '/validation-expert/findings',
      '/validation-expert/evidence',
    ]);
  });
});
