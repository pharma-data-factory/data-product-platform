import { useState } from 'react';
import { NEXORA_GREY } from '@internal/plugin-nexora-common';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  COMPONENT_TYPES,
  INTERFACE_TYPES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from '@internal/platform-common';
import type {
  ProductComponent,
  ProductRequirement,
  ProductVersion,
  TraceabilityLink,
} from '@internal/platform-common';
import type { ProductTraceability } from '../api';

interface ArchitectureTabProps {
  selectedVersion?: ProductVersion;
  components: ProductComponent[];
  requirements: ProductRequirement[];
  traceability: ProductTraceability | null;
  onAddComponent: (input: Record<string, unknown>) => Promise<void>;
  onAddLink: (input: Record<string, unknown>) => Promise<void>;
  /** NXD-157. Offered while the version is DRAFT. */
  onRemoveComponent?: (componentId: string) => Promise<void>;
  onRemoveLink?: (linkId: string) => Promise<void>;
}

/**
 * NXD-157. Remove, then confirm in place: the question names what goes,
 * and nothing is removed until the second click.
 */
function RemoveControl(props: {
  label: string;
  question: string;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button
        size="small"
        aria-label={props.label}
        onClick={() => setAsking(true)}
      >
        Remove
      </Button>
    );
  }
  return (
    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
      <Typography variant="body2" color="textSecondary">
        {props.question}
      </Typography>
      <Button
        size="small"
        color="secondary"
        onClick={() => {
          setAsking(false);
          props.onConfirm();
        }}
      >
        Confirm removal
      </Button>
      <Button size="small" onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </Box>
  );
}

/** What a component card says beneath its name; exported for the test. */
export function componentDetails(component: ProductComponent): string[] {
  const parts = [
    component.interfaceType
      ? `Interface ${component.interfaceType}`
      : undefined,
    component.ref ? `Ref ${component.ref}` : undefined,
    component.createdBy
      ? `added by ${component.createdBy}${
          component.createdAt
            ? ` on ${new Date(component.createdAt).toISOString().slice(0, 10)}`
            : ''
        }`
      : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? [parts.join(' · ')] : [];
}

/**
 * Why the component form is disabled, when it is.
 *
 * Same shape as the baseline binding's helper text: state the refusal before
 * the user fills a form that cannot be submitted.
 *
 * DRAFT-only is no longer a UI rule: `addProductComponent` refuses a non-DRAFT
 * version with a 409 since NXD-072, so an API client can no longer change a
 * released version's architecture behind the page's back. This text stays
 * anyway — the server saying no is the invariant, and saying it before the
 * form is filled in is the courtesy. They are not substitutes for each other.
 */
function componentHelperText(version?: ProductVersion): string | undefined {
  if (!version) {
    return 'Create a version first.';
  }
  if (version.status !== 'DRAFT') {
    return `Version is ${version.status}. Components can only be added while the version is DRAFT.`;
  }
  return undefined;
}

export function ArchitectureTab({
  selectedVersion,
  components,
  requirements,
  traceability,
  onAddComponent,
  onAddLink,
  onRemoveComponent,
  onRemoveLink,
}: ArchitectureTabProps) {
  const [componentName, setComponentName] = useState('');
  const [componentType, setComponentType] = useState<string>(
    COMPONENT_TYPES[0],
  );
  const [componentRef, setComponentRef] = useState('');
  const [interfaceType, setInterfaceType] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationshipType, setRelationshipType] = useState('IMPLEMENTS');

  const componentsLocked =
    !selectedVersion || selectedVersion.status !== 'DRAFT';
  const lockReason = componentHelperText(selectedVersion);
  const editable = !componentsLocked;

  // NXD-157. Names instead of ids: a link reads as requirement → component.
  const nameOfComponent = (id: string) =>
    components.find(c => c.id === id)?.name;
  const requirementTitle = (ref: string) =>
    requirements.find(r => r.requirementRef === ref)?.title;
  const endpoint = (id: string) => {
    const name = nameOfComponent(id);
    if (name) return name;
    const title = requirementTitle(id);
    return title ? `${id} ${title}` : id;
  };
  // The product's links, narrowed to the selected version's components.
  const ids = new Set(components.map(c => c.id));
  const versionLinks: TraceabilityLink[] = (traceability?.links ?? []).filter(
    link => ids.has(link.targetId) || ids.has(link.sourceId),
  );
  const implementedBy = (componentId: string) =>
    versionLinks.filter(
      link =>
        link.targetId === componentId &&
        link.relationshipType === 'IMPLEMENTS' &&
        !ids.has(link.sourceId),
    );

  const addComponent = async () => {
    if (!componentName.trim() || componentsLocked) {
      return;
    }
    await onAddComponent({
      componentType,
      name: componentName.trim(),
      ref: componentRef.trim() || undefined,
      interfaceType: interfaceType || undefined,
    });
    setComponentName('');
    setComponentRef('');
    setInterfaceType('');
  };

  const addLink = async () => {
    if (!sourceId.trim() || !targetId) {
      return;
    }
    await onAddLink({
      sourceType: 'URS_REQUIREMENT_VERSION',
      sourceId: sourceId.trim(),
      relationshipType,
      targetType: 'PRODUCT_COMPONENT',
      targetId,
    });
    setSourceId('');
  };

  return (
    <>
      <section>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Components
        </Typography>
        {/*
          Scoped to the *selected* version, not the latest one. The form used
          to write against `latestVersion` while the picker selected any
          version, so a component added while viewing an older version landed
          silently on the newest — the same mismatch NXD-055 resolved on the
          read path.
        */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 16,
            alignItems: 'flex-start',
          }}
        >
          <TextField
            id="component-name"
            label="Name"
            value={componentName}
            onChange={e => setComponentName(e.target.value)}
            disabled={componentsLocked}
            style={{ minWidth: 200 }}
            helperText={lockReason}
          />
          <TextField
            select
            id="component-type"
            label="Type"
            value={componentType}
            onChange={e => setComponentType(e.target.value)}
            disabled={componentsLocked}
            style={{ minWidth: 200 }}
          >
            {COMPONENT_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id="component-ref"
            label="Ref"
            value={componentRef}
            onChange={e => setComponentRef(e.target.value)}
            disabled={componentsLocked}
            style={{ minWidth: 240 }}
          />
          <TextField
            select
            id="component-interface"
            label="Interface"
            value={interfaceType}
            onChange={e => setInterfaceType(e.target.value)}
            disabled={componentsLocked}
            style={{ minWidth: 160 }}
          >
            <MenuItem value="">—</MenuItem>
            {INTERFACE_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            color="primary"
            disabled={componentsLocked}
            onClick={addComponent}
          >
            Add component
          </Button>
        </div>
        {components.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No components.
          </Typography>
        ) : (
          components.map(component => (
            <section
              key={component.id}
              style={{
                border: `1px solid ${NEXORA_GREY[200]}`,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                <Typography variant="subtitle1">{component.name}</Typography>
                <Chip size="small" label={component.componentType} />
                <span style={{ flex: 1 }} />
                {editable && onRemoveComponent ? (
                  <RemoveControl
                    label={`Remove ${component.name}`}
                    question={(() => {
                      const links = versionLinks.filter(
                        l =>
                          l.targetId === component.id ||
                          l.sourceId === component.id,
                      ).length;
                      return `Remove ${component.name}${
                        links > 0
                          ? ` and its ${links} traceability link${
                              links === 1 ? '' : 's'
                            }`
                          : ''
                      }? The removal is recorded in the audit trail.`;
                    })()}
                    onConfirm={() => onRemoveComponent(component.id)}
                  />
                ) : null}
              </Box>
              {component.description ? (
                <Typography variant="body2">{component.description}</Typography>
              ) : null}
              {componentDetails(component).map(line => (
                <Typography key={line} variant="body2" color="textSecondary">
                  {line}
                </Typography>
              ))}
              <Typography variant="body2" color="textSecondary">
                {implementedBy(component.id).length > 0
                  ? `Implements ${implementedBy(component.id)
                      .map(l => endpoint(l.sourceId))
                      .join(', ')}`
                  : 'Implements no requirement yet.'}
              </Typography>
            </section>
          ))
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <Typography variant="h6" style={{ marginBottom: 12 }}>
          Traceability
        </Typography>
        {traceability ? (
          <Typography variant="body2">
            Coverage: {traceability.coveredComponentCount}/
            {traceability.componentCount} components linked (
            {Math.round(traceability.coverage * 100)}%)
          </Typography>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
          }}
        >
          {/*
            Was a free-text box with placeholder "URS-OUT-001". A typed id
            matched nothing and nobody found out: the link stored fine,
            reported as coverage, and pointed at a requirement that did not
            exist. Selecting from the bound baseline makes the id a reference
            instead of a string.
          */}
          <TextField
            select
            id="trace-requirement"
            label="Requirement"
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            disabled={requirements.length === 0}
            style={{ minWidth: 280 }}
            helperText={
              requirements.length === 0
                ? 'Bind a URS baseline to this version first.'
                : undefined
            }
          >
            <MenuItem value="">Select…</MenuItem>
            {requirements.map(requirement => (
              <MenuItem key={requirement.id} value={requirement.requirementRef}>
                {requirement.requirementRef} — {requirement.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            id="trace-component"
            label="Component"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            style={{ minWidth: 240 }}
          >
            <MenuItem value="">Select…</MenuItem>
            {components.map(component => (
              <MenuItem key={component.id} value={component.id}>
                {component.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            id="trace-relationship"
            label="Relationship"
            value={relationshipType}
            onChange={e => setRelationshipType(e.target.value)}
            style={{ minWidth: 180 }}
          >
            {TRACEABILITY_RELATIONSHIP_TYPES.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" color="primary" onClick={addLink}>
            Link requirement
          </Button>
        </div>
        {versionLinks.map(link => (
          <Box
            key={link.id}
            display="flex"
            alignItems="center"
            style={{ gap: 8, marginTop: 4 }}
          >
            <Typography variant="body2">
              {endpoint(link.sourceId)} —{link.relationshipType}→{' '}
              {endpoint(link.targetId)}
            </Typography>
            {editable && onRemoveLink ? (
              <RemoveControl
                label={`Remove link ${endpoint(link.sourceId)} to ${endpoint(
                  link.targetId,
                )}`}
                question={`Remove the link ${endpoint(link.sourceId)} —${
                  link.relationshipType
                }→ ${endpoint(
                  link.targetId,
                )}? The removal is recorded in the audit trail.`}
                onConfirm={() => onRemoveLink(link.id)}
              />
            ) : null}
          </Box>
        ))}
      </section>
    </>
  );
}
