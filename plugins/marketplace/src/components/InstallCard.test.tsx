import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import type {
  ArtifactInstallation,
  InstallableVersionView,
  RuntimeTarget,
} from '@internal/platform-common';
import { InstallCard } from './InstallCard';
import { installationsApiRef, type InstallationsApi } from '../installationsApi';

const DIGEST = `sha256:${'a'.repeat(64)}`;

const VERSIONS: InstallableVersionView[] = [
  {
    version: '1.0.0',
    imageDigest: DIGEST,
    config: [
      { key: 'EQUIPMENT_ID', type: 'string', required: true, defaultValue: 'filler-01' },
      { key: 'MQTT_PASSWORD', type: 'secret', required: false },
    ],
  },
];

const TARGET = {
  id: 't-1',
  name: 'basel-line-3',
  displayName: 'Basel line 3',
  providerKind: 'docker-compose',
} as RuntimeTarget;

function installation(overrides: Partial<ArtifactInstallation> = {}): ArtifactInstallation {
  return {
    id: 'i-1',
    targetId: 't-1',
    name: 'oee',
    namespace: 'pharma',
    artifactName: 'oee',
    desired: { state: 'PRESENT', version: '1.0.0' },
    gmpRelevant: true,
    gmpClassificationSource: 'PRODUCT',
    qualificationStatus: 'PENDING_EVIDENCE',
    ...overrides,
  } as ArtifactInstallation;
}

function fakeApi(overrides: Partial<InstallationsApi> = {}): jest.Mocked<InstallationsApi> {
  return {
    listTargets: jest.fn(async () => [TARGET]),
    listInstallations: jest.fn(async () => []),
    gmpClassification: jest.fn(async () => ({ gmpRelevant: true, source: 'NO_PRODUCT' as const })),
    install: jest.fn(async () => installation()),
    ...overrides,
  } as jest.Mocked<InstallationsApi>;
}

function renderCard(api: InstallationsApi, canInstall = true) {
  return render(
    <TestApiProvider apis={[[installationsApiRef, api]]}>
      <InstallCard
        namespace="pharma"
        name="oee"
        displayName="OEE Line 3"
        versions={VERSIONS}
        canInstall={canInstall}
      />
    </TestApiProvider>,
  );
}

function field(label: RegExp): HTMLElement {
  return screen.getByLabelText(label);
}

describe('InstallCard (NXD-141)', () => {
  it('lists only this artifact’s installations, with what has and has not been reported', async () => {
    renderCard(
      fakeApi({
        listInstallations: jest.fn(async () => [
          installation(),
          installation({ id: 'i-2', name: 'other', artifactName: 'something-else' }),
        ]),
      }),
    );
    expect(await screen.findByText('oee')).toBeInTheDocument();
    expect(screen.getByText(/on Basel line 3/)).toBeInTheDocument();
    expect(
      screen.getByText(/Running: no provider has reported · Qualification: pending evidence/),
    ).toBeInTheDocument();
    expect(screen.queryByText('other')).not.toBeInTheDocument();
  });

  it('offers Install only with installation.manage, and only when a target exists', async () => {
    const { unmount } = renderCard(fakeApi(), false);
    expect(await screen.findByText(/needs the installation.manage permission/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    unmount();

    renderCard(fakeApi({ listTargets: jest.fn(async () => []) }));
    expect(await screen.findByText(/No runtime target is registered yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('says so when the installations cannot be loaded', async () => {
    renderCard(fakeApi({ listInstallations: jest.fn(async () => Promise.reject(new Error('500 boom'))) }));
    expect(await screen.findByText('Could not load installations')).toBeInTheDocument();
  });

  it('signs a GMP install with justification and PIN, and sends the configuration', async () => {
    const api = fakeApi();
    renderCard(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    expect(await screen.findByText(/No Nexora product governs it/)).toBeInTheDocument();

    const sign = screen.getByRole('button', { name: 'Sign and install' });
    expect(sign).toBeDisabled();
    fireEvent.change(field(/MQTT_PASSWORD/), { target: { value: 'line3/mqtt' } });
    fireEvent.change(field(/^Justification/), { target: { value: 'Go-live CC-118.' } });
    expect(sign).toBeDisabled();
    fireEvent.change(field(/^Signing PIN/), { target: { value: '2468' } });
    expect(sign).toBeEnabled();
    fireEvent.click(sign);

    await waitFor(() => expect(api.install).toHaveBeenCalledTimes(1));
    expect(api.install).toHaveBeenCalledWith({
      targetId: 't-1',
      artifactRef: 'pharma/oee@1.0.0',
      name: 'oee',
      config: { MQTT_PASSWORD: { secretRef: 'line3/mqtt' } },
      signature: { justification: 'Go-live CC-118.', pin: '2468' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/“oee” is recorded/);
  });

  it('shows the store’s refusal verbatim and clears the PIN', async () => {
    const api = fakeApi({
      install: jest.fn(async () => Promise.reject(new Error('Re-authentication failed. Signature rejected.'))),
    });
    renderCard(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    await screen.findByText(/No Nexora product governs it/);
    fireEvent.change(field(/^Justification/), { target: { value: 'Go-live.' } });
    fireEvent.change(field(/^Signing PIN/), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign and install' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Re-authentication failed. Signature rejected.',
    );
    expect(field(/^Signing PIN/)).toHaveValue('');
  });

  it('refuses to send a literal secret, before anyone signs', async () => {
    renderCard(fakeApi());
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    await screen.findByText(/No Nexora product governs it/);
    fireEvent.change(field(/MQTT_PASSWORD/), { target: { value: 'Hunter2!' } });
    fireEvent.change(field(/^Justification/), { target: { value: 'Go-live.' } });
    fireEvent.change(field(/^Signing PIN/), { target: { value: '2468' } });
    expect(screen.getByText(/MQTT_PASSWORD.secretRef is not a secret name/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign and install' })).toBeDisabled();
  });

  it('asks only for a confirmation when the product is not GMP-relevant', async () => {
    const api = fakeApi({
      gmpClassification: jest.fn(async () => ({ gmpRelevant: false, source: 'PRODUCT' as const })),
    });
    renderCard(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    await screen.findByText(/not GMP-relevant: confirm/);
    expect(screen.queryByLabelText(/^Signing PIN/)).not.toBeInTheDocument();
    const dialogInstall = screen.getAllByRole('button', { name: 'Install' }).pop()!;
    expect(dialogInstall).toBeDisabled();
    fireEvent.click(screen.getByLabelText('I confirm this installation.'));
    fireEvent.click(dialogInstall);
    await waitFor(() => expect(api.install).toHaveBeenCalledTimes(1));
    expect(api.install.mock.calls[0][0].signature).toEqual({ confirmed: true, justification: undefined });
  });

  it('asks for the signature when the classification cannot be read', async () => {
    renderCard(fakeApi({ gmpClassification: jest.fn(async () => Promise.reject(new Error('503'))) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    expect(await screen.findByText(/could not be read, so it is treated as GMP-relevant/)).toBeInTheDocument();
    expect(field(/^Signing PIN/)).toBeInTheDocument();
  });
});
