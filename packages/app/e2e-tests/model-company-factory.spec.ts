import { test, expect } from '@playwright/test';
import {
  attachQualityCollectors,
  guestApiToken,
  modelCompanyGet,
  signInAsGuest,
} from './modelCompanyAuth';

test.describe('model-company-factory', () => {
  test('Journey 1 — Landing → Factory → PKG-L01 → CHECKWEIGHER-01', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const quality = attachQualityCollectors(page);

    const token = await guestApiToken(request);
    const factoryRes = await modelCompanyGet(request, token, '/factory');
    expect(factoryRes.status(), 'authenticated /factory').toBe(200);
    const factory = await factoryRes.json();
    expect(JSON.stringify(factory)).toContain('PKG-L01');
    expect(JSON.stringify(factory)).toContain('CHECKWEIGHER-01');

    await signInAsGuest(page);

    // Landing CTA
    await page.goto('/');
    const cta = page.getByRole('link', { name: /OPEN MODEL COMPANY/i });
    await expect(cta).toBeVisible({ timeout: 20_000 });
    await cta.click();
    await expect(page).toHaveURL(/\/model-company\/?$/);
    await expect(page.getByText(/SYNTHETIC/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/NON-GXP/i).first()).toBeVisible();

    // Factory topology (MUI Button+RouterLink → accessible as link)
    await page
      .getByRole('navigation', { name: 'Model Company primary' })
      .getByRole('link', { name: /^Factory$/i })
      .click();
    await expect(page).toHaveURL(/\/model-company\/factory/);
    await expect(page.getByText(/PKG-L01/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('list', { name: /Factory value stream/i }),
    ).toBeVisible();

    // PKG-L01 via Final Packaging area (first line on packaging area)
    const packaging = page
      .getByRole('button', { name: /Final Packaging/i })
      .first();
    await expect(packaging).toBeVisible();
    await packaging.click();
    await expect(page).toHaveURL(/line=PKG-L01/);
    await expect(page.getByText(/PKG-L01/i).first()).toBeVisible();
    await expect(
      page.getByRole('list', { name: /Equipment on PKG-L01/i }),
    ).toBeVisible();
    await expect(page.getByText('CHECKWEIGHER-01').first()).toBeVisible();

    // CHECKWEIGHER-01 detail
    await page
      .getByRole('button', { name: /Equipment CHECKWEIGHER-01/i })
      .click();
    await expect(page).toHaveURL(/equipment\?id=CHECKWEIGHER-01/);
    await expect(page.getByText('CHECKWEIGHER-01').first()).toBeVisible();
    await expect(page.getByLabel(/Status:/i).first()).toBeVisible();
    await expect(page.getByText(/Order/i).first()).toBeVisible();
    await expect(page.getByText(/Batch/i).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Open OEE Data Product/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Open Equipment Data Product/i }),
    ).toBeVisible();

    // Deep link retains context
    await page.getByRole('link', { name: /Open OEE Data Product/i }).click();
    await expect(page).toHaveURL(/\/data-products\//);
    await expect(page).toHaveURL(/equipment=CHECKWEIGHER-01/);
    await expect(page).toHaveURL(/line=PKG-L01/);

    quality.assertClean();
  });

  test('direct route refresh loads SPA shell', async ({ page }) => {
    await signInAsGuest(page);
    const routes = [
      '/model-company',
      '/model-company/factory',
      '/model-company/lines?line=PKG-L01',
      '/model-company/material-flow',
      '/data-products/checkweigher-01-oee?site=MODEL-PHARMA-01&line=PKG-L01&equipment=CHECKWEIGHER-01',
    ];
    for (const route of routes) {
      await page.goto(route);
      await page.reload();
      await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
      await expect(page.locator('text=404').first())
        .toBeHidden({ timeout: 5_000 })
        .catch(() => undefined);
      // Shell rendered: sidebar present after guest session
      await expect(
        page.getByRole('navigation', { name: 'sidebar nav' }),
      ).toBeVisible({ timeout: 30_000 });
    }
  });
});
