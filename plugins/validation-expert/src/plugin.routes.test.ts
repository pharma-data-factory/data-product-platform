import {
  validationExpertPlugin,
  validationExpertRegisteredPaths,
} from './plugin';
import { OVERVIEW_CARD_LINKS } from './components/OverviewPage';

describe('validationExpertPlugin routes', () => {
  it('exposes route refs for all dashboard destinations', () => {
    const routeKeys = Object.keys(validationExpertPlugin.routes ?? {});
    expect(routeKeys).toEqual(
      expect.arrayContaining([
        'root',
        'contexts',
        'contextDetail',
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
    for (const card of OVERVIEW_CARD_LINKS) {
      expect(validationExpertRegisteredPaths).toContain(card.to);
    }
  });

  it('maps every overview card link to the expected route', () => {
    expect(OVERVIEW_CARD_LINKS.map(card => card.to)).toEqual([
      '/validation-expert/contexts',
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
