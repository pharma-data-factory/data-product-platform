import { type ReactNode } from 'react';
import { C } from '../identity/landingTokens';

const node = {
  factory: {
    background: C.primary,
    border: `1px solid ${C.primary}`,
    color: C.onPrimary,
  },
  product: {
    background: C.card,
    border: '1px solid rgba(0,194,217,0.45)',
    color: C.text,
  },
  interface: {
    background: C.tint,
    border: '1px solid rgba(0,194,217,0.35)',
    color: C.text,
  },
  consumer: {
    background: C.section,
    border: `1px solid ${C.border}`,
    color: C.text,
  },
} as const;

function Node({
  label,
  tone = 'product',
}: {
  label: string;
  tone?: keyof typeof node;
}) {
  return (
    <span className="pdf-diag-node" style={node[tone]}>
      {label}
    </span>
  );
}

function Arrow() {
  return (
    <div className="pdf-diag-arrow" aria-hidden="true">
      ↓
    </div>
  );
}

function Layer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="pdf-diag-layer">
      <p className="pdf-diag-layer-title">{title}</p>
      {children}
    </div>
  );
}

export function DeveloperArchitectureDiagram() {
  return (
    <div
      className="pdf-diag pdf-diag-compact"
      role="group"
      aria-label="Developer architecture: Nexora Control Plane with Catalog, Marketplace and Create leading to a Golden Path, composition manifest, Platform Components, generated Data Product and independent runtime"
    >
      <div className="pdf-diag-stack">
        <Layer title="CONTROL PLANE">
          <div className="pdf-diag-nodes">
            <Node label="Catalog" tone="factory" />
            <Node label="Marketplace" tone="factory" />
            <Node label="Create" tone="factory" />
          </div>
        </Layer>
        <Arrow />
        <Layer title="GOLDEN PATH">
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.5, color: C.muted }}>
            certified composition pattern
          </p>
          <div className="pdf-diag-nodes">
            <Node label="composition manifest" tone="interface" />
          </div>
        </Layer>
        <Arrow />
        <Layer title="PLATFORM COMPONENTS">
          <div className="pdf-diag-nodes">
            <Node label="MQTT Consumer" />
            <Node label="REST Source" />
            <Node label="REST API" />
            <Node label="Health" />
            <Node label="Observability" />
          </div>
        </Layer>
        <Arrow />
        <div className="pdf-diag-split">
          <article className="pdf-diag-layer">
            <p className="pdf-diag-layer-title">AAS / Semantics</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
              what the asset means
            </p>
          </article>
          <article className="pdf-diag-layer">
            <p className="pdf-diag-layer-title">UNS / MQTT / REST</p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
              where data flows
            </p>
          </article>
        </div>
        <Arrow />
        <Layer title="GENERATED DATA PRODUCT">
          <div className="pdf-diag-nodes">
            <Node label="GitHub" tone="product" />
            <Node label="CI/CD" tone="product" />
            <Node label="Docker" tone="product" />
            <Node label="Contract" tone="product" />
            <Node label="Quality" tone="product" />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: C.muted }}>
            Catalog registers the product
          </p>
        </Layer>
        <Arrow />
        <Layer title="INDEPENDENT RUNTIME">
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.5, color: C.muted }}>
            does not require the Control Plane
          </p>
          <div className="pdf-diag-nodes">
            <Node label="CONSUMERS" tone="consumer" />
          </div>
        </Layer>
      </div>
    </div>
  );
}
