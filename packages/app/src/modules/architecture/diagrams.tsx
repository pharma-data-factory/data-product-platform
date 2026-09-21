import { type ReactNode } from 'react';
import { C, PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../identity/landingTokens';
import {
  NEXORA_ACCENT,
  NEXORA_CARD,
  NEXORA_GREY,
  NEXORA_SECTION,
} from '@internal/plugin-nexora-common';
import {
  CATALOG_RELATIONSHIPS,
  DEVELOPER_FLOW_STEPS,
  EXAMPLE_DATA_PRODUCTS,
  FACTORY_CAPABILITIES,
  GOVERNED_INTERFACES,
  RUNTIME_CONSUMERS,
  RUNTIME_STEPS,
  SYSTEM_OF_RECORD_SYSTEMS,
} from './constants';

type NodeTone =
  | 'core'
  | 'interface'
  | 'factory'
  | 'kernel'
  | 'product'
  | 'consumer'
  | 'step'
  | 'ok'
  | 'break';

const TONE: Record<NodeTone, { bg: string; border: string; color: string }> = {
  core: { bg: NEXORA_GREY[50], border: C.border, color: PHARMA_NAVY },
  interface: { bg: 'rgba(0,194,217,0.08)', border: 'rgba(0,194,217,0.35)', color: PHARMA_NAVY },
  factory: { bg: PHARMA_NAVY, border: PHARMA_NAVY, color: NEXORA_GREY[50] },
  kernel: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.28)', color: NEXORA_GREY[200] },
  product: { bg: NEXORA_CARD, border: 'rgba(0,194,217,0.45)', color: PHARMA_NAVY },
  consumer: { bg: NEXORA_SECTION, border: C.border, color: PHARMA_NAVY },
  step: { bg: NEXORA_CARD, border: C.border, color: PHARMA_NAVY },
  ok: { bg: 'rgba(0,194,217,0.10)', border: PHARMA_TEAL, color: PHARMA_NAVY },
  break: { bg: NEXORA_ACCENT.dangerSurface, border: NEXORA_ACCENT.dangerBorder, color: '#7F1D1D' },
};

export function ArchitectureDiagramStyles() {
  return (
    <style>{`
      .pdf-diag {
        width: 100%;
        background: ${C.paper};
        border: 1px solid ${C.border};
        border-radius: 16px;
        padding: 24px;
        overflow: hidden;
      }
      .pdf-diag-compact {
        padding: 16px;
      }
      .pdf-diag-compact .pdf-diag-layer {
        padding: 12px 14px;
      }
      .pdf-diag-compact .pdf-diag-layer-title {
        margin: 0 0 8px;
      }
      .pdf-diag-compact .pdf-diag-stack {
        gap: 8px;
      }
      .pdf-diag-stack {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .pdf-diag-layer {
        border-radius: 14px;
        padding: 16px;
        background: ${C.section};
        border: 1px solid ${C.border};
      }
      .pdf-diag-layer-title {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: ${PHARMA_TEAL};
        margin: 0 0 12px;
        font-weight: 600;
      }
      .pdf-diag-nodes {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pdf-diag-node {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 8px 12px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        text-align: center;
      }
      .pdf-diag-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${PHARMA_TEAL};
        font-size: 18px;
        line-height: 1;
        font-weight: 600;
      }
      .pdf-diag-flow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .pdf-diag-flow .pdf-diag-node { flex: 1 1 140px; }
      .pdf-diag-split {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          max-height: 0;
        }
        to {
          opacity: 1;
          max-height: 10000px;
        }
      }
      @media (max-width: 700px) {
        .pdf-diag { padding: 16px; }
        .pdf-diag-flow { flex-direction: column; align-items: stretch; }
        .pdf-diag-flow .pdf-diag-node { flex: 1 1 auto; }
        .pdf-diag-arrow { transform: rotate(90deg); }
        .pdf-diag-flow .pdf-diag-arrow { transform: none; }
      }
    `}</style>
  );
}

function Node({
  label,
  tone = 'step',
}: {
  label: string;
  tone?: NodeTone;
}) {
  const style = TONE[tone];
  return (
    <span
      className="pdf-diag-node"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
      }}
    >
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

function FlowArrow() {
  return (
    <div className="pdf-diag-arrow" aria-hidden="true">
      →
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
      <div className="pdf-diag-nodes">{children}</div>
    </div>
  );
}

export function SystemArchitectureDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="System architecture from core systems through governed integration to Data Products"
    >
      <div className="pdf-diag-stack">
        <Layer title="Systems of record">
          {SYSTEM_OF_RECORD_SYSTEMS.map(label => (
            <Node key={label} label={label} tone="core" />
          ))}
        </Layer>
        <Arrow />
        <Layer title="Governed integration">
          {GOVERNED_INTERFACES.map(label => (
            <Node key={label} label={label} tone="interface" />
          ))}
        </Layer>
        <Arrow />
        <Layer title="Nexora">
          {FACTORY_CAPABILITIES.map(label => (
            <Node key={label} label={label} tone="factory" />
          ))}
        </Layer>
        <Arrow />
        <Layer title="Data Products">
          {EXAMPLE_DATA_PRODUCTS.map(label => (
            <Node key={label} label={label} tone="product" />
          ))}
        </Layer>
      </div>
    </div>
  );
}

function runtimeTone(index: number, last: number): NodeTone {
  if (index === 0) {
    return 'core';
  }
  if (index === last) {
    return 'consumer';
  }
  return 'step';
}

export function DataProductRuntimeDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Data Product runtime from source system to consumers"
    >
      <div className="pdf-diag-flow">
        {RUNTIME_STEPS.map((step, index) => (
          <span key={step} style={{ display: 'contents' }}>
            {index > 0 && <FlowArrow />}
            <Node
              label={step}
              tone={runtimeTone(index, RUNTIME_STEPS.length - 1)}
            />
          </span>
        ))}
      </div>
      <p
        className="pdf-diag-layer-title"
        style={{ marginTop: 20 }}
      >
        Consumers may include
      </p>
      <div className="pdf-diag-nodes">
        {RUNTIME_CONSUMERS.map(label => (
          <Node key={label} label={label} tone="consumer" />
        ))}
      </div>
    </div>
  );
}

function stepTone(step: string): NodeTone {
  if (step === 'Nexora') {
    return 'factory';
  }
  if (step === 'Certified Golden Path') {
    return 'interface';
  }
  return 'step';
}

export function DeveloperFlowDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Developer flow from Golden Path to catalog and documentation"
    >
      <div className="pdf-diag-flow">
        {DEVELOPER_FLOW_STEPS.map((step, index) => (
          <span key={step} style={{ display: 'contents' }}>
            {index > 0 && <FlowArrow />}
            <Node label={step} tone={stepTone(step)} />
          </span>
        ))}
      </div>
      <p
        className="pdf-mono"
        style={{
          margin: '20px 0 0',
          color: PHARMA_TEAL,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Build once. Govern by default.
      </p>
    </div>
  );
}

export function ContractConsumerDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Data contract, catalog relationships, and compatibility examples"
    >
      <div className="pdf-diag-flow" style={{ marginBottom: 20 }}>
        <Node label="Provider Data Product" tone="product" />
        <FlowArrow />
        <Node label="Data Contract" tone="interface" />
        <FlowArrow />
        <Node label="Consumers" tone="consumer" />
      </div>
      <p className="pdf-diag-layer-title">Catalog relationships</p>
      <div className="pdf-diag-nodes" style={{ marginBottom: 20 }}>
        {CATALOG_RELATIONSHIPS.map(label => (
          <Node key={label} label={label} tone="step" />
        ))}
      </div>
      <div className="pdf-diag-split">
        <article className="pdf-diag-layer" aria-label="Compatible contract change">
          <p className="pdf-diag-layer-title">Compatible change</p>
          <div className="pdf-diag-flow">
            <Node label="v1.1" tone="step" />
            <FlowArrow />
            <Node label="v1.2" tone="ok" />
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: C.muted }}>
            Optional field. COMPATIBLE.
          </p>
        </article>
        <article className="pdf-diag-layer" aria-label="Breaking contract change">
          <p className="pdf-diag-layer-title">Breaking change</p>
          <div className="pdf-diag-flow">
            <Node label="v1.x" tone="step" />
            <FlowArrow />
            <Node label="v2.0" tone="break" />
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, color: C.muted }}>
            Breaking schema change. BREAKING CHANGE.
          </p>
        </article>
      </div>
    </div>
  );
}

export function DiagramExplanation({
  what,
  why,
  how,
  decoupled,
}: {
  what: string;
  why: string;
  how: string;
  decoupled: string;
}) {
  const items = [
    ['WHAT IT DOES', what],
    ['WHY IT EXISTS', why],
    ['HOW IT CONNECTS', how],
    ['WHAT REMAINS DECOUPLED', decoupled],
  ] as const;

  return (
    <dl
      style={{
        margin: '20px 0 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {items.map(([title, body]) => (
        <div key={title} className="pdf-card" style={{ padding: 16, margin: 0 }}>
          <dt
            className="pdf-mono"
            style={{
              color: PHARMA_TEAL,
              fontSize: 11,
              letterSpacing: '0.14em',
              margin: 0,
              fontWeight: 600,
            }}
          >
            {title}
          </dt>
          <dd style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: C.text }}>
            {body}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Foundation stack: Data Products sit on Nexora, which sits on
 * the open-source Backstage platform kernel. We extend Backstage — we do not
 * fork it.
 */
export function BackstageFoundationDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Platform foundation: Data Products sit on Nexora, which sits on the open-source Backstage platform kernel"
    >
      <div className="pdf-diag-stack">
        <Layer title="Data Products">
          <Node label="MQTT Temperature" tone="product" />
          <Node label="REST Equipment" tone="product" />
          <Node label="OEE" tone="product" />
        </Layer>
        <div className="pdf-diag-arrow" aria-hidden="true">
          ↑
        </div>
        <Layer title="Nexora">
          <Node label="Data Product standard" tone="factory" />
          <Node label="Platform Components" tone="factory" />
          <Node label="Contracts & quality" tone="factory" />
          <Node label="Golden Paths" tone="factory" />
        </Layer>
        <div className="pdf-diag-arrow" aria-hidden="true">
          ↑
        </div>
        <div
          className="pdf-diag-layer"
          style={{ background: PHARMA_NAVY, borderColor: PHARMA_NAVY }}
        >
          <p className="pdf-diag-layer-title" style={{ color: PHARMA_TEAL_LIGHT }}>
            Backstage — open-source platform kernel
          </p>
          <div className="pdf-diag-nodes">
            <Node label="Software Catalog" tone="kernel" />
            <Node label="Scaffolder" tone="kernel" />
            <Node label="TechDocs" tone="kernel" />
            <Node label="Search" tone="kernel" />
            <Node label="Identity & RBAC" tone="kernel" />
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: NEXORA_GREY[400] }}>
            Everything sits on this. We extend Backstage — we do not fork it.
          </p>
        </div>
      </div>
    </div>
  );
}
