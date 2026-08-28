import { test, expect } from '@playwright/test';
import {
  attachQualityCollectors,
  guestApiToken,
  modelCompanyGet,
  signInAsGuest,
} from './modelCompanyAuth';

test.describe('model-company-material-flow', () => {
  test('Journey 2 — Material Flow → FGB batch → genealogy', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const quality = attachQualityCollectors(page);
    const token = await guestApiToken(request);

    // Ensure campaign material exists (backend-supported actions only)
    const reset = await request.post(
      'http://localhost:7007/api/model-company/simulation/reset',
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { seed: 42 },
      },
    );
    expect(reset.status()).toBeLessThan(400);

    const run = await request.post(
      'http://localhost:7007/api/model-company/scenarios/run',
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { scenarioId: 'SCN-AI-001', seed: 42 },
      },
    );
    expect(run.status()).toBeLessThan(400);

    // Advance until packaging batch appears (poll existing APIs)
    let fgbId: string | undefined;
    let dpbId: string | undefined;
    let aibId: string | undefined;
    for (let i = 0; i < 40; i++) {
      await request.post(
        'http://localhost:7007/api/model-company/simulation/tick',
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {},
        },
      );
      const batchesRes = await modelCompanyGet(request, token, '/batches');
      expect(batchesRes.status()).toBe(200);
      const batchesBody = await batchesRes.json();
      const items = (batchesBody.items ?? batchesBody.batches ?? []) as Array<{
        batchId?: string;
        id?: string;
        materialId?: string;
        role?: string;
      }>;
      const ids = items.map(b => b.batchId ?? b.id ?? '').filter(Boolean);
      fgbId = ids.find(id => id.startsWith('FGB-'));
      aibId = ids.find(id => id.startsWith('AIB-'));
      dpbId = ids.find(id => id.startsWith('DPB-'));
      if (fgbId && aibId && dpbId) {
        break;
      }
    }
    expect(fgbId, 'FGB batch from API').toBeTruthy();
    expect(aibId, 'AIB batch from API').toBeTruthy();
    expect(dpbId, 'DPB batch from API').toBeTruthy();

    const genealogyRes = await modelCompanyGet(request, token, '/genealogy');
    expect(genealogyRes.status()).toBe(200);
    const genealogy = await genealogyRes.json();
    const geneStr = JSON.stringify(genealogy);
    expect(geneStr).toContain(fgbId!);
    expect(geneStr).toMatch(/AIB-|DPB-/);

    await signInAsGuest(page);
    await page.goto('/model-company/material-flow');
    await expect(page.getByText(/Material Flow/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // Material / batch / HU nodes from API-backed UI
    await expect(page.getByText(fgbId!).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/DPB-|AIB-|FGB-|HU-/).first()).toBeVisible();

    const fgbButton = page.getByRole('button', {
      name: new RegExp(`Batch ${fgbId}`, 'i'),
    });
    await expect(fgbButton).toBeVisible();
    await fgbButton.click();

    // Genealogy panel uses API edges (upstream AIB / DPB)
    await expect(page.getByText(/GENEALOGY/i).first()).toBeVisible();
    await expect(page.getByText(aibId!).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(dpbId!).first()).toBeVisible({ timeout: 15_000 });

    quality.assertClean();
  });
});
