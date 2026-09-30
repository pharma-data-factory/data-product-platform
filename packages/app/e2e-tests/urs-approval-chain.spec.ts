/**
 * The URS approval chain, end to end, in a browser (NXD-097).
 *
 * Every decision record since NXD-055 ended with "not verified against a
 * running stack": producing an approved baseline needs several identities
 * under Segregation of Duties. NXD-057 added the demo identities that make it
 * possible; this is the first test that walks it.
 *
 * Division of labour, deliberately:
 * - The API authors the set: creating it, adding requirements and moving
 *   them to IN_APPROVAL is data entry the wizard's own tests cover.
 * - The browser does everything regulated: creating and submitting the
 *   baseline, each approval step, and the QA signature — each as the seat
 *   that must perform it, each through the e-signature dialog with a PIN.
 * - The API then reads back what the server recorded, because a green page
 *   is a claim and the database is the record.
 *
 * Run against app-config.yaml + app-config.demo.yaml + app-config.e2e.yaml
 * on PostgreSQL; see the e2e job in .github/workflows/ci.yml.
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

const AUTHOR = 'demo-author';
const REVIEWER = 'demo-reviewer';
const QUALITY = 'demo-quality';
const PIN = 'e2e-pin-4711';

async function demoToken(
  request: APIRequestContext,
  user: string,
): Promise<string> {
  const res = await request.get('/api/auth/demo/refresh', {
    headers: { 'x-nexora-demo-user': user, 'X-Requested-With': 'XMLHttpRequest' },
  });
  expect(res.ok(), `demo sign-in for ${user}: ${res.status()}`).toBeTruthy();
  const token = (await res.json())?.backstageIdentity?.token as string;
  expect(token).toBeTruthy();
  return token;
}

function urs(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const call = async (method: 'get' | 'post' | 'put', path: string, data?: unknown) => {
    const res = await request[method](`/api/urs-composer${path}`, { headers, data });
    return res;
  };
  return {
    call,
    async json(method: 'get' | 'post' | 'put', path: string, data?: unknown) {
      const res = await call(method, path, data);
      expect(res.ok(), `${method.toUpperCase()} ${path}: ${res.status()} ${await res.text()}`).toBeTruthy();
      return res.status() === 204 ? undefined : res.json();
    },
  };
}

/** `isVisible()` does not wait; this does, and says whether it appeared. */
async function appears(locator: ReturnType<Page['getByRole']>, timeout: number) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

/** A fresh browser context per seat: the demo seat lives in sessionStorage. */
async function seat(browser: Browser, user: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  // The public landing page asks for cookie consent first and the dialog
  // covers the Sign In button. The minimal choice, as a careful user would.
  const necessaryOnly = page.getByRole('button', { name: 'Necessary only' });
  if (await appears(necessaryOnly, 10_000)) {
    await necessaryOnly.click();
  }
  const signIn = page.getByRole('button', { name: 'Sign In' }).first();
  if (await appears(signIn, 10_000)) {
    await signIn.click();
  }
  await page.getByRole('button', { name: `Continue as ${user}` }).click();
  // Names the seat, which is the thing that must be true before acting as it.
  await expect(
    page.getByRole('heading', { name: `Welcome, ${user}` }),
  ).toBeVisible({ timeout: 30_000 });
  return page;
}

async function openWorkflow(page: Page, setId: string) {
  await page.goto(`/urs-composer/${setId}`);
  await page.getByRole('tab', { name: 'Workflow' }).click();
}

async function signWithPin(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Signing PIN').fill(PIN);
  await dialog.getByRole('button', { name: 'Sign' }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

test.describe('URS approval chain', () => {
  test('author → baseline → business review → QA signature → approved', async ({
    browser,
    request,
  }) => {
    test.setTimeout(300_000);

    const author = urs(request, await demoToken(request, AUTHOR));
    const reviewer = urs(request, await demoToken(request, REVIEWER));
    const quality = urs(request, await demoToken(request, QUALITY));

    // ── Authoring, via the API ──────────────────────────────────────────
    const capabilities = await author.json('get', '/capabilities');
    const capabilityRef = (capabilities.items ?? capabilities)[0]?.id;
    expect(capabilityRef, 'a seeded business capability').toBeTruthy();

    const set = await author.json('post', '/requirement-sets', {
      businessCapabilityRefs: [capabilityRef],
      businessNeed: 'E2E: prove the approval chain end to end',
      solutionType: 'DATA_PRODUCT',
      solutionName: `E2E Chain ${Date.now()}`,
      gxpRelevance: 'DIRECT',
    });
    for (const n of [1, 2]) {
      await author.json('post', `/requirement-sets/${set.id}/requirements`, {
        title: `E2E requirement ${n}`,
        statement: `The system shall record approval step ${n} with its signer.`,
        priority: 'MUST',
      });
    }
    for (const status of ['IN_REVIEW', 'REVIEWED', 'IN_APPROVAL']) {
      await author.json('post', `/requirement-sets/${set.id}/versions/transition`, {
        status,
      });
    }
    await reviewer.json('put', '/signing-pin', { pin: PIN });
    await quality.json('put', '/signing-pin', { pin: PIN });

    // ── Author: create and submit the baseline, in the browser ─────────
    const authorPage = await seat(browser, AUTHOR);
    await openWorkflow(authorPage, set.id);
    await authorPage.getByRole('button', { name: 'Create Baseline' }).click();
    const createDialog = authorPage.getByRole('dialog');
    await createDialog.getByRole('button', { name: 'Create' }).click();
    await expect(createDialog).toBeHidden({ timeout: 30_000 });
    await authorPage.getByRole('button', { name: 'Submit for Approval' }).click();
    await expect(authorPage.getByText('Approval Workflow')).toBeVisible({
      timeout: 30_000,
    });

    // Wait for the record, not the page: the heading can render before the
    // submit has been answered, and a repeated run caught exactly that.
    let baseline: any;
    await expect
      .poll(
        async () => {
          const body = await author.json(
            'get',
            `/requirement-sets/${set.id}/baselines`,
          );
          [baseline] = body.items ?? body;
          return baseline?.approvalInstanceId ?? null;
        },
        { timeout: 30_000 },
      )
      .not.toBeNull();

    // Segregation of Duties is live, not only unit-tested: the author may
    // not take the business-review step.
    const instance = await author.json('get', `/approvals/${baseline.approvalInstanceId}`);
    const step1 = instance.steps.find((s: any) => s.sequence === 1);
    const refused = await author.call(
      'post',
      `/approvals/${instance.id}/steps/${step1.id}/approve`,
      { pin: PIN },
    );
    expect(refused.status()).toBe(403);

    // ── Reviewer: steps 1 and 2 ─────────────────────────────────────────
    const reviewerPage = await seat(browser, REVIEWER);
    await openWorkflow(reviewerPage, set.id);
    for (const _step of [1, 2]) {
      await reviewerPage.getByRole('button', { name: 'Approve' }).first().click();
      await signWithPin(reviewerPage);
    }

    // ── Quality: QA signature on the versions, then step 3 ──────────────
    const qualityPage = await seat(browser, QUALITY);
    await openWorkflow(qualityPage, set.id);
    await qualityPage
      .getByRole('button', { name: 'Apply QA approval signature' })
      .click();
    await signWithPin(qualityPage);

    await qualityPage.getByRole('button', { name: 'Approve' }).first().click();
    await signWithPin(qualityPage);

    // ── The record, not the page ────────────────────────────────────────
    await expect
      .poll(async () => (await quality.json('get', `/baselines/${baseline.id}`)).status, {
        timeout: 30_000,
      })
      .toBe('APPROVED');
    expect((await quality.json('get', `/requirement-sets/${set.id}`)).status).toBe(
      'APPROVED',
    );
    const finished = await quality.json('get', `/approvals/${instance.id}`);
    expect(finished.status).toBe('APPROVED');
    // Who acted on each step, as the server recorded it: the reviewer took
    // steps 1 and 2, quality took step 3, and the author took none.
    const actedBy = [...finished.steps]
      .sort((a: any, b: any) => a.sequence - b.sequence)
      .map((step: any) => step.actedBy as string);
    expect(actedBy).toEqual([
      expect.stringContaining(REVIEWER),
      expect.stringContaining(REVIEWER),
      expect.stringContaining(QUALITY),
    ]);
  });
});
