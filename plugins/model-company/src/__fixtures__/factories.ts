import type { FactoryApiModel } from '../factoryModel';

/** Minimal factory proving UI is configuration-driven (not Autoinjector-hardcoded). */
export const minimalFactoryFixture: FactoryApiModel = {
  company: {
    id: 'minimal-co',
    name: 'Minimal Test Pharma',
    classification: {
      environment: 'simulation',
      dataClassification: 'synthetic',
      gxpScope: 'out-of-scope',
      productionUse: false,
    },
  },
  uns: { root: 'uns', enterpriseId: 'minimal-co' },
  sites: [
    {
      id: 'MIN-SITE-01',
      name: 'Minimal Site',
      displayName: 'Minimal Test Pharma',
      areas: [
        {
          id: 'AREA-A',
          name: 'Primary Area',
          lines: [
            {
              id: 'LINE-A1',
              name: 'Line Alpha',
              areaId: 'AREA-A',
              siteId: 'MIN-SITE-01',
              equipment: [
                {
                  id: 'EQ-01',
                  type: 'mixer',
                  lineId: 'LINE-A1',
                  areaId: 'AREA-A',
                  siteId: 'MIN-SITE-01',
                  runtime: { state: 'RUNNING', speed: 10, goodCount: 100, rejectCount: 1 },
                },
                {
                  id: 'EQ-02',
                  type: 'inspector',
                  lineId: 'LINE-A1',
                  areaId: 'AREA-A',
                  siteId: 'MIN-SITE-01',
                  runtime: { state: 'IDLE', speed: 0, goodCount: 100, rejectCount: 1 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  lineCount: 1,
  equipmentCount: 2,
};

export const autoinjectorLikeFixture: FactoryApiModel = {
  company: { id: 'model-pharma', name: 'Nexora Model Pharma' },
  sites: [
    {
      id: 'MODEL-PHARMA-01',
      name: 'Model Pharma Plant',
      displayName: 'Nexora Model Pharma',
      areas: [
        {
          id: 'PACKAGING',
          name: 'Final Packaging',
          lines: [
            {
              id: 'PKG-L01',
              name: 'Final Packaging Line',
              areaId: 'PACKAGING',
              siteId: 'MODEL-PHARMA-01',
              equipment: [
                {
                  id: 'CHECKWEIGHER-01',
                  type: 'checkweigher',
                  lineId: 'PKG-L01',
                  areaId: 'PACKAGING',
                  siteId: 'MODEL-PHARMA-01',
                  runtime: {
                    state: 'MICROSTOP',
                    reasonCode: 'PRODUCT_JAM',
                    goodCount: 31840,
                    rejectCount: 184,
                    speed: 0,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
