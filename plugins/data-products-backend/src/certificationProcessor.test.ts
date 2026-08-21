import { Entity } from '@backstage/catalog-model';
import { FileCertificationOverlay } from './certificationOverlay';
import { CertificationOverlayProcessor } from './certificationProcessor';

describe('CertificationOverlayProcessor', () => {
  const overlay = {
    getStatus: jest.fn(),
  } as unknown as FileCertificationOverlay;
  const processor = new CertificationOverlayProcessor(overlay);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overlays persisted certification onto Data Product components', async () => {
    (overlay.getStatus as jest.Mock).mockReturnValue('TESTED');
    const entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'cold-room',
        annotations: { 'dataprod.platform/certification-status': 'DEVELOPMENT' },
      },
      spec: { type: 'data-product' },
    } as Entity;

    await expect(processor.postProcessEntity(entity)).resolves.toEqual({
      ...entity,
      metadata: {
        ...entity.metadata,
        annotations: {
          'dataprod.platform/certification-status': 'TESTED',
        },
      },
    });
  });

  it('does not invent a second product record for other entities', async () => {
    const entity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'API',
      metadata: { name: 'temperature-event' },
      spec: { type: 'contract' },
    } as Entity;

    await expect(processor.postProcessEntity(entity)).resolves.toBe(entity);
    expect(overlay.getStatus).not.toHaveBeenCalled();
  });
});
