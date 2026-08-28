import { expect, type Page, type APIRequestContext } from '@playwright/test';

/** Sign in via Guest provider (local development). */
export async function signInAsGuest(page: Page): Promise<void> {
  await page.goto('/');
  const guest = page.getByRole('button', { name: 'Continue as Guest' }).first();
  if (await guest.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await guest.click();
  } else {
    const signIn = page.getByRole('button', { name: 'Sign In' }).first();
    if (await signIn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signIn.click();
      await expect(
        page.getByRole('button', { name: 'Continue as Guest' }).first(),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Continue as Guest' }).first().click();
    }
  }
  await expect(
    page.getByRole('navigation', { name: 'sidebar nav' }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Collect page errors and failed model-company API responses during a journey. */
export function attachQualityCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedApis: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });
  page.on('response', res => {
    const url = res.url();
    if (!url.includes('/api/model-company/')) {
      return;
    }
    if (res.status() === 401 || res.status() === 403 || res.status() >= 500) {
      failedApis.push(`${res.status()} ${res.request().method()} ${url}`);
    }
  });

  return {
    consoleErrors,
    pageErrors,
    failedApis,
    assertClean() {
      const authFails = failedApis.filter(f => f.startsWith('401') || f.startsWith('403'));
      expect(authFails, `auth failures: ${authFails.join('; ')}`).toEqual([]);
      expect(pageErrors, `page errors: ${pageErrors.join('; ')}`).toEqual([]);
      const severe = consoleErrors.filter(
        e =>
          !e.includes('Download the React DevTools') &&
          !e.includes('punycode') &&
          !/favicon/i.test(e),
      );
      expect(severe, `console errors: ${severe.join('; ')}`).toEqual([]);
    },
  };
}

/** Obtain a guest Backstage token for direct API checks. */
export async function guestApiToken(
  request: APIRequestContext,
): Promise<string> {
  const res = await request.get('http://localhost:7007/api/auth/guest/refresh');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const token = body?.backstageIdentity?.token as string | undefined;
  expect(token).toBeTruthy();
  return token!;
}

export async function modelCompanyGet(
  request: APIRequestContext,
  token: string,
  path: string,
) {
  const res = await request.get(`http://localhost:7007/api/model-company${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}
