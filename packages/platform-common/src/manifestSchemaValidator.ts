/**
 * Enforces `nexora-manifest.schema.json` on the sections NXD-130 added:
 * `metadata.license`, `spec.runtime`, `spec.interfaces` and `spec.config`.
 *
 * Kept apart from `validateArtifactManifest` on purpose. That function also
 * runs in the browser (`marketplaceViewOfManifest`), and ajv compiles schemas
 * into functions at runtime — not something the Marketplace page should do.
 * The registry's registration gate is the one place that calls this, and every
 * manifest the Marketplace reads has passed it.
 *
 * The older fields stay with the hand-written validator. Evaluating the whole
 * schema here would report each of their problems twice, in two wordings.
 * `manifestSchema.test.ts` checks that the schema and that validator agree.
 */
import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from 'ajv/dist/2020';
import { NEXORA_MANIFEST_SCHEMA } from './manifestSchema';

const SCHEMA_ID = NEXORA_MANIFEST_SCHEMA.$id as string;

let ajv: Ajv2020 | undefined;

function compiler(): Ajv2020 {
  if (!ajv) {
    // `verbose` keeps the failing subschema on each error, which is where a
    // pattern's human description lives. `strictTypes` is an ajv lint against
    // applicator subschemas without `type`, not a JSON Schema rule.
    ajv = new Ajv2020({
      allErrors: true,
      verbose: true,
      strict: true,
      strictTypes: false,
      strictRequired: false,
    });
    ajv.addSchema(NEXORA_MANIFEST_SCHEMA as object);
  }
  return ajv;
}

function subschema(pointer: string): ValidateFunction {
  const validate = compiler().getSchema(`${SCHEMA_ID}#${pointer}`);
  if (!validate) {
    // A pointer that resolves nowhere is a defect in this file, not in the
    // manifest being checked. Failing loudly beats validating nothing.
    throw new Error(`nexora manifest schema has no subschema at ${pointer}`);
  }
  return validate;
}

/**
 * The full schema, compiled once. The registry gate evaluates only the NXD-130
 * sections; this is for checking a whole document, as the template tests do
 * with a rendered Golden Path.
 */
export function nexoraManifestSchemaValidator(): ValidateFunction {
  return subschema('');
}

const SECTIONS: Array<{
  path: string;
  pointer: string;
  read: (manifest: Record<string, any>) => unknown;
}> = [
  {
    path: 'metadata.license',
    pointer: '/$defs/license',
    read: m => m.metadata?.license,
  },
  {
    path: 'spec.runtime',
    pointer: '/$defs/runtime',
    read: m => m.spec?.runtime,
  },
  {
    path: 'spec.interfaces',
    pointer: '/$defs/interfaces',
    read: m => m.spec?.interfaces,
  },
  {
    path: 'spec.config',
    pointer: '/$defs/config',
    read: m => m.spec?.config,
  },
];

/**
 * Why the NXD-130 sections of `input` are not usable, or `[]` if they are.
 *
 * Returns every problem, as `validateArtifactManifest` does, so a publisher
 * fixes a manifest in one pass. Input that is not even a mapping is left to
 * that validator, which already says so.
 */
export function validateRunnableManifestSections(input: unknown): string[] {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return [];
  }
  const manifest = input as Record<string, any>;
  const issues: string[] = [];

  for (const section of SECTIONS) {
    const value = section.read(manifest);
    if (value === undefined) continue;
    const validate = subschema(section.pointer);
    if (!validate(value)) {
      issues.push(...describeErrors(section.path, validate.errors ?? []));
    }
  }

  issues.push(...crossFieldIssues(manifest.spec));
  return [...new Set(issues)];
}

/**
 * The rules JSON Schema cannot state: a name must refer to something declared
 * elsewhere in the same document, and names must be unique within their list.
 */
function crossFieldIssues(spec: unknown): string[] {
  if (typeof spec !== 'object' || spec === null) return [];
  const { runtime, interfaces, config } = spec as Record<string, any>;
  const issues: string[] = [];

  const ports: unknown[] = Array.isArray(runtime?.ports) ? runtime.ports : [];
  const portNames = ports
    .map(port => (port as Record<string, unknown>)?.name)
    .filter((name): name is string => typeof name === 'string');
  issues.push(...duplicates('spec.runtime.ports', 'name', portNames));
  const declared = new Set(portNames);

  const healthPort = runtime?.health?.port;
  if (typeof healthPort === 'string' && !declared.has(healthPort)) {
    issues.push(
      `spec.runtime.health.port "${healthPort}" names no port in spec.runtime.ports`,
    );
  }

  if (Array.isArray(interfaces)) {
    const names: string[] = [];
    interfaces.forEach((item: Record<string, unknown>, index: number) => {
      if (typeof item?.name === 'string') names.push(item.name);
      if (typeof item?.port === 'string' && !declared.has(item.port)) {
        issues.push(
          `spec.interfaces[${index}].port "${item.port}" names no port in spec.runtime.ports`,
        );
      }
    });
    issues.push(...duplicates('spec.interfaces', 'name', names));
  }

  if (Array.isArray(config)) {
    const keys = config
      .map((entry: Record<string, unknown>) => entry?.key)
      .filter((key): key is string => typeof key === 'string');
    issues.push(...duplicates('spec.config', 'key', keys));
  }

  return issues;
}

function duplicates(path: string, field: string, values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].map(
    value => `${path}: ${field} "${value}" is declared more than once`,
  );
}

function describeErrors(base: string, errors: ErrorObject[]): string[] {
  const issues: string[] = [];
  for (const error of errors) {
    // An `if` failure only says "must match then"; the clause that failed is
    // reported beside it, with the field it is about.
    if (error.keyword === 'if') continue;
    const path = base + pathOf(error.instancePath);
    const params = error.params as Record<string, any>;
    switch (error.keyword) {
      case 'false schema':
        issues.push(`${path} is not allowed here`);
        break;
      case 'additionalProperties':
        issues.push(
          `${path}.${params.additionalProperty} is not a known field`,
        );
        break;
      case 'required':
        issues.push(`${path}.${params.missingProperty} is required`);
        break;
      case 'enum':
        issues.push(
          `${path} must be one of ${params.allowedValues.join(', ')}`,
        );
        break;
      case 'const':
        issues.push(`${path} must be ${params.allowedValue}`);
        break;
      case 'pattern': {
        const description = (error.parentSchema as Record<string, unknown>)
          ?.description;
        const why = typeof description === 'string' ? `. ${description}` : '';
        issues.push(`${path} "${String(error.data)}" is not valid${why}`);
        break;
      }
      default:
        issues.push(`${path} ${error.message ?? 'is invalid'}`);
    }
  }
  return issues;
}

/** `/ports/0/name` → `.ports[0].name`, unescaping JSON Pointer. */
function pathOf(pointer: string): string {
  if (!pointer) return '';
  return pointer
    .split('/')
    .slice(1)
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
    .map(segment => (/^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`))
    .join('');
}
