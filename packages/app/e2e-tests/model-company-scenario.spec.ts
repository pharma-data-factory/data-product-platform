import { test, expect } from '@playwright/test';
import {
  attachQualityCollectors,
  guestApiToken,
  modelCompanyGet,
  signInAsGuest,
} from './modelCompanyAuth';

test.describe('model-company-scenario', () => {
  test('Journey 3 — SCN-AI-007 → CHECKWEIGHER-01 reflects backend state', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    const quality = attachQualityCollectors(page);
    const token = await guestApiToken(request);

    await signInAsGuest(page);
    await page.goto('/model-company/scenarios');
    await expect(page.getByText(/Scenario Control Center/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('SCN-AI-007').first()).toBeVisible();

    // Backend-supported controls only
    await page.getByRole('button', { name: /^Reset$/i }).click();
    await page.waitForTimeout(1_500);

    const scenarioCard = page.locator('div').filter({ hasText: 'SCN-AI-007' }).first();
    await scenarioCard.getByRole('button', { name: /Run scenario/i }).click();

    // Wait until UI or API shows SCN-AI-007 active / simulation running
    await expect
      .poll(
        async () => {
          const sim = await modelCompanyGet(request, token, '/simulation');
          if (sim.status() !== 200) return 'api-fail';
          const body = await sim.json();
          return `${body.scenarioId ?? body.currentScenario ?? ''}|${body.status ?? body.simulation ?? ''}`;
        },
        { timeout: 60_000 },
      )
      .toMatch(/SCN-AI-007/);

    // Tick until CHECKWEIGHER shows MICROSTOP (scenario-driven, not fake FE state)
    let cwState = '';
    let reason = '';
    for (let i = 0; i < 50; i++) {
      await request.post(
        'http://localhost:7007/api/model-company/simulation/tick',
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {},
        },
      );
      const eqRes = await modelCompanyGet(request, token, '/equipment');
      expect(eqRes.status()).toBe(200);
      const body = await eqRes.json();
      const items = (body.items ?? body.equipment ?? []) as Array<{
        id?: string;
        equipmentId?: string;
        state?: string;
        runtime?: { state?: string; reasonCode?: string };
        reasonCode?: string;
      }>;
      const cw = items.find(
        e => (e.id ?? e.equipmentId) === 'CHECKWEIGHER-01',
      );
      cwState = cw?.runtime?.state ?? cw?.state ?? '';
      reason = cw?.runtime?.reasonCode ?? cw?.reasonCode ?? '';
      if (cwState === 'MICROSTOP' || /JAM|MICROSTOP/i.test(reason)) {
        break;
      }
      await page.waitForTimeout(200);
    }

    expect(
      cwState === 'MICROSTOP' || /JAM|MICROSTOP/i.test(reason),
      `expected MICROSTOP from backend, got state=${cwState} reason=${reason}`,
    ).toBeTruthy();

    // UI reflects backend after poll refresh
    await page.goto('/model-company/factory');
    await expect(page.getByText(/PKG-L01/i).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/model-company/lines?line=PKG-L01');
    await expect(
      page.getByRole('button', { name: /Equipment CHECKWEIGHER-01/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/model-company/equipment?id=CHECKWEIGHER-01');
    await expect(page.getByText('CHECKWEIGHER-01').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(/MICROSTOP|PRODUCT_JAM|JAM/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    // Confirm UI state matches API (no fabricated FE metrics)
    const liveEq = await modelCompanyGet(request, token, '/equipment');
    const liveBody = await liveEq.json();
    const liveItems = (liveBody.items ?? liveBody.equipment ?? []) as Array<{
      id?: string;
      equipmentId?: string;
      state?: string;
      runtime?: { state?: string };
    }>;
    const liveCw = liveItems.find(
      e => (e.id ?? e.equipmentId) === 'CHECKWEIGHER-01',
    );
    const apiState = liveCw?.runtime?.state ?? liveCw?.state ?? '';
    if (apiState) {
      await expect(page.getByText(new RegExp(apiState, 'i')).first()).toBeVisible();
    }

    quality.assertClean();
  });
});
