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

const logger: any = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn((): any => logger),
};

describe('Golden Path skeletons render through the real fetch:template (NXD-105)', () => {
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
            values: Object.fromEntries(
              Object.keys(step.input.values ?? {}).map(key => [
                key,
                `test-${key}`,
              ]),
            ),
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
      } finally {
        fs.rmSync(workspacePath, { recursive: true, force: true });
      }
    },
    60000,
  );
});
