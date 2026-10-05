/**
 * Every Golden Path skeleton goes through the real `fetch:template` (NXD-105).
 *
 * The OEE Golden Path had never completed a run. `content/app/main.py` held
 * the Python literal `"${{"`, which Nunjucks — configured by Backstage with
 * `${{` as its variable start — reads as an unterminated placeholder, so
 * every run stopped at *Fetch skeleton* with "[Line 56, Column 47] expected
 * variable end". It surfaced only when a user ran it with GitHub credentials
 * for the first time.
 *
 * The template tests could not see it: they substitute `${{ … }}` with a
 * regular expression, which renders the file happily. So this one does not
 * imitate the templater. It runs Backstage's own action, from the package the
 * scaffolder runs it from, against every local `fetch:template` step of every
 * template, with that step's own `copyWithoutTemplating`.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import yaml from 'yaml';
import { createFetchTemplateAction } from '@backstage/plugin-scaffolder-backend';

const ROOT = path.resolve(__dirname, '../../..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');

type FetchStep = {
  template: string;
  templateFile: string;
  id: string;
  input: Record<string, any>;
};

function localFetchTemplateSteps(): FetchStep[] {
  const steps: FetchStep[] = [];
  for (const template of fs.readdirSync(TEMPLATES_DIR).sort()) {
    const templateFile = path.join(TEMPLATES_DIR, template, 'template.yaml');
    if (!fs.existsSync(templateFile)) {
      continue;
    }
    for (const doc of yaml.parseAllDocuments(
      fs.readFileSync(templateFile, 'utf8'),
    )) {
      for (const step of doc.toJSON()?.spec?.steps ?? []) {
        const url = step.input?.url;
        if (step.action === 'fetch:template' && url && !/^https?:/.test(url)) {
          steps.push({
            template,
            templateFile,
            id: step.id,
            input: step.input,
          });
        }
      }
    }
  }
  return steps;
}

/**
 * A template's own literals pass through as written; only what comes from the
 * form (`${{ … }}`) is replaced. NXD-118: `policyVersion: '1'` rendered as a
 * YAML number, and a placeholder for every value had hidden it, because a
 * placeholder is always a string.
 */
function renderValues(values: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'string' && !value.includes('${{')
        ? value
        : `test-${key}`,
    ]),
  );
}

/**
 * The Catalog refuses an entity whose annotation or label is not a string
 * ("Malformed envelope … must be string"), and it does so only after the
 * repository is published. Checked here, before anything is.
 */
function nonStringMetadata(workspacePath: string): string[] {
  const file = path.join(workspacePath, 'catalog-info.yaml');
  if (!fs.existsSync(file)) {
    return [];
  }
  const problems: string[] = [];
  for (const doc of yaml.parseAllDocuments(fs.readFileSync(file, 'utf8'))) {
    const entity = doc.toJSON();
    for (const field of ['annotations', 'labels'] as const) {
      for (const [key, value] of Object.entries(
        entity?.metadata?.[field] ?? {},
      )) {
        if (typeof value !== 'string') {
          problems.push(
            `${entity?.metadata?.name} ${field}.${key} = ${JSON.stringify(
              value,
            )}`,
          );
        }
      }
    }
  }
  return problems;
}

const logger: any = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn((): any => logger),
};

describe('Golden Path skeletons render through the real fetch:template (NXD-105, NXD-118)', () => {
  const steps = localFetchTemplateSteps();

  // Only parseRepoUrl reads integrations, and only when a template calls it;
  // a template that does will fail here loudly rather than pass silently.
  const action = createFetchTemplateAction({
    reader: {} as any,
    integrations: { byHost: () => undefined, byUrl: () => undefined } as any,
  });

  it('finds the templates it is meant to check', () => {
    expect(steps.map(s => s.template)).toEqual(
      expect.arrayContaining(['oee-data-product', 'mqtt-temperature-product']),
    );
  });

  it.each(steps.map(s => [`${s.template} · ${s.id}`, s] as const))(
    '%s',
    async (_label, step) => {
      const workspacePath = fs.mkdtempSync(
        path.join(os.tmpdir(), 'nexora-render-'),
      );
      try {
        await action.handler({
          input: {
            // Placeholder values: this checks that every file parses as a
            // template, not what a particular product renders to.
            ...step.input,
            values: renderValues(step.input.values),
          },
          workspacePath,
          logger,
          templateInfo: { baseUrl: pathToFileURL(step.templateFile).href },
          output: jest.fn(),
          createTemporaryDirectory: async () =>
            fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-render-tmp-')),
          checkpoint: async ({ fn }: { fn: () => any }) => fn(),
          getInitiatorCredentials: async () => ({}),
        } as any);

        expect(fs.readdirSync(workspacePath).length).toBeGreaterThan(0);
        expect(nonStringMetadata(workspacePath)).toEqual([]);
      } finally {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    },
    60000,
  );
});
