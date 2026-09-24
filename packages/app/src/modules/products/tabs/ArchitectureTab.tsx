import { useState } from 'react';
import { NEXORA_GREY } from '@internal/plugin-nexora-common';
import { Button, MenuItem, TextField, Typography } from '@material-ui/core';
import {
  COMPONENT_TYPES,
  INTERFACE_TYPES,
  TRACEABILITY_RELATIONSHIP_TYPES,
} from '@internal/platform-common';
import type {
  ProductComponent,
  ProductRequirement,
  ProductVersion,
} from '@internal/platform-common';
import type { ProductTraceability } from '../api';

interface ArchitectureTabProps {
  selectedVersion?: ProductVersion;
  components: ProductComponent[];
  requirements: ProductRequirement[];
  traceability: ProductTraceability | null;
  onAddComponent: (input: Record<string, unknown>) => Promise<void>;
  onAddLink: (input: Record<string, unknown>) => Promise<void>;
}

/**
 * Why the component form is disabled, when it is.
 *
 * Same shape as the baseline binding's helper text: state the refusal before
 * the user fills a form that cannot be submitted.
 *
 * DRAFT-only is a UI rule for now — `addProductComponent` on the server does
 * not check the version status, so a released version's architecture could
 * still be changed by an API client. The rule belongs in the service; until it
 * is there, the page at least does not offer it.
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
}: ArchitectureTabProps) {
  const [componentName, setComponentName] = useState('');
  const [componentType, setComponentType] = useState<string>(COMPONENT_TYPES[0]);
  const [componentRef, setComponentRef] = useState('');
  const [interfaceType, setInterfaceType] = useState('');

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relationshipType, setRelationshipType] = useState('IMPLEMENTS');

  const componentsLocked =
    !selectedVersion || selectedVersion.status !== 'DRAFT';
  const lockReason = componentHelperText(selectedVersion);

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
              <Typography variant="subtitle1">
                {component.name}{' '}
                <span style={{ color: NEXORA_GREY[500] }}>
                  {component.componentType}
                </span>
              </Typography>
              {component.ref ? (
                <Typography variant="body2" color="textSecondary">
                  ref: {component.ref}
                </Typography>
              ) : null}
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
        {traceability && traceability.links.length > 0
          ? traceability.links.map(link => (
              <Typography key={link.id} variant="body2" style={{ marginTop: 4 }}>
                {link.sourceId} —{link.relationshipType}→ {link.targetId}
              </Typography>
            ))
          : null}
      </section>
    </>
  );
}
