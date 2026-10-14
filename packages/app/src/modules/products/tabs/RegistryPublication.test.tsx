/**
 * The registry card on the Tests tab (NXD-137): one act at a time, in the
 * registry's order, and the registry's own words when it refuses.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegistryPublication, nextRegistryAction } from './RegistryPublication';

const REF = 'pharma-data-factory/oee-e2e-test-20261005-d@1.0.0';
const build = {
  imageRepository: 'ghcr.io/pharma-data-factory/oee-e2e-test-20261005-d',
  imageDigest:
    'sha256:6e696d5fc0b22f352bd5980c906f34d3af9c72e9a34ba70adc99453f752fd810',
  commitSha: '431fd71d0fcb5c9c56773f58fb451435db8f1c87',
  releaseUrl:
    'https://github.com/pharma-data-factory/oee-e2e-test-20261005-d/releases/tag/v1.0.0',
};
const version = (patch: Record<string, unknown>) =>
  ({
    id: 'av-1',
    artifactId: 'a-1',
    version: '1.0.0',
    lifecycle: 'DRAFT',
    releaseBuild: build,
    ...patch,
  } as any);

describe('nextRegistryAction', () => {
  it.each([
    [{ lifecycle: 'DRAFT' }, 'submit'],
    [{ lifecycle: 'TESTING' }, 'review'],
    [{ lifecycle: 'TESTING', certificationStatus: 'TESTED' }, 'certify'],
    [{ lifecycle: 'CERTIFIED' }, 'publish'],
    [{ lifecycle: 'RELEASED' }, undefined],
  ])('%j → %s', (state, action) => {
    expect(nextRegistryAction(state as any)?.action).toBe(action);
  });
});

describe('RegistryPublication', () => {
  it('shows the build and moves the version on by one act', async () => {
    const transition = jest
      .fn()
      .mockResolvedValue(version({ lifecycle: 'TESTING' }));
    render(
      <RegistryPublication
        artifactRef={REF}
        loadVersion={jest.fn().mockResolvedValue(version({}))}
        transition={transition}
      />,
    );
    expect(
      await screen.findByText(new RegExp(build.imageDigest)),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit for testing' }));
    expect(
      await screen.findByRole('button', { name: 'Record review' }),
    ).toBeInTheDocument();
    expect(transition).toHaveBeenCalledWith('av-1', 'submit');
  });

  it("shows the registry's refusal verbatim (R8)", async () => {
    const refusal =
      'Artifact version av-1 cannot be certified: it declares spec.runtime but has no recorded release build (image digest).';
    render(
      <RegistryPublication
        artifactRef={REF}
        loadVersion={jest
          .fn()
          .mockResolvedValue(
            version({
              lifecycle: 'TESTING',
              certificationStatus: 'TESTED',
              releaseBuild: undefined,
            }),
          )}
        transition={jest.fn().mockRejectedValue(new Error(refusal))}
      />,
    );
    expect(
      await screen.findByText(/No release build recorded/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Certify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(refusal);
  });

  it('offers nothing more once published', async () => {
    render(
      <RegistryPublication
        artifactRef={REF}
        loadVersion={jest
          .fn()
          .mockResolvedValue(version({ lifecycle: 'RELEASED' }))}
        transition={jest.fn()}
      />,
    );
    expect(await screen.findByText(/Published: available/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
