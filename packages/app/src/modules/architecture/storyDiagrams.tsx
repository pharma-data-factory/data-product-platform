import { C } from '../identity/landingTokens';
import { StoryStatusBadge } from '../identity/ArchitecturePrinciple';
import {
  AAS_UNS_MAPPING,
  CONTROL_PLANE_CAPABILITIES,
  FILLER_ASSET_EXAMPLE,
  GOLDEN_PATH_EXAMPLES,
  OEE_GOLDEN_PATH_COMPOSITION,
  PLATFORM_COMPONENT_GROUPS,
  STORY_DATA_PRODUCTS,
} from '../identity/platformStoryData';

export function FullPlatformStackDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Full platform stack from systems of record to consumers"
    >
      {[
        ['CONTROL PLANE', 'Pharma Data Factory governs Catalog, Create, Marketplace, CI/CD, TechDocs, Search, RBAC and certification.'],
        ['GOLDEN PATHS', 'Certified compositions. MQTT Temperature, REST Equipment and OEE are CERTIFIED. Cold Chain, Quality, Energy and AI Assistant are future.'],
        ['PLATFORM COMPONENTS', 'Reusable technical capabilities. Intelligence components are planned.'],
        ['AAS AND UNS', 'AAS owns meaning. Unified Namespace owns operational data flow.'],
        ['DATA PRODUCTS', 'Independently deployable domain runtimes. They do not require the Control Plane to keep running.'],
        ['SYSTEMS OF RECORD', 'ERP, MES, LIMS, EWM, Historian, CMO, PLC / SCADA and other IT/OT stay authoritative.'],
      ].map(([title, body]) => (
        <div key={title} className="pdf-diag-layer" style={{ marginBottom: 10 }}>
          <p className="pdf-diag-layer-title">{title}</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.text }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

export function AasVsUnsDiagram() {
  return (
    <div className="pdf-diag" role="group" aria-label="AAS versus Unified Namespace">
      <div className="pdf-diag-split">
        <article className="pdf-diag-layer" aria-label="AAS meaning">
          <p className="pdf-diag-layer-title">AAS = meaning</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            {FILLER_ASSET_EXAMPLE.name}: {FILLER_ASSET_EXAMPLE.properties.join(', ')}.
            Asset {AAS_UNS_MAPPING.asset}, property {AAS_UNS_MAPPING.property}, unit{' '}
            {AAS_UNS_MAPPING.unit}. AAS is not a historian.
          </p>
        </article>
        <article className="pdf-diag-layer" aria-label="UNS data flow">
          <p className="pdf-diag-layer-title">UNS = data flow</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            Topic {AAS_UNS_MAPPING.topic}. Unified Namespace governs where and how
            operational values move. It does not own asset semantics.
          </p>
        </article>
      </div>
    </div>
  );
}

export function PlatformComponentCompositionDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Platform Component composition groups and status"
    >
      <div className="pdf-diag-split">
        {PLATFORM_COMPONENT_GROUPS.map(group => (
          <article key={group.id} className="pdf-diag-layer" aria-label={group.title}>
            <p className="pdf-diag-layer-title">{group.title}</p>
            {group.items.map(item => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                <StoryStatusBadge status={item.status} />
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

export function GoldenPathLifecycleDiagram() {
  return (
    <div className="pdf-diag" role="group" aria-label="Golden Path lifecycle and examples">
      <p className="pdf-diag-layer-title">Compose certified capabilities</p>
      <div className="pdf-diag-nodes" style={{ marginBottom: 16 }}>
        {GOLDEN_PATH_EXAMPLES.map(item => (
          <span key={item.name} className="pdf-diag-node" style={{ gap: 8 }}>
            {item.name} <StoryStatusBadge status={item.status} />
          </span>
        ))}
      </div>
      <p className="pdf-diag-layer-title">OEE composition</p>
      <div className="pdf-diag-nodes" aria-label="OEE composition">
        {OEE_GOLDEN_PATH_COMPOSITION.map(item => (
          <span key={item.name} className="pdf-diag-node" style={{ gap: 8 }}>
            {item.name} <StoryStatusBadge status={item.status} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function ControlPlaneVsDataPlaneDiagram() {
  return (
    <div className="pdf-diag" role="group" aria-label="Control Plane versus data plane">
      <div className="pdf-diag-split">
        <article className="pdf-diag-layer">
          <p className="pdf-diag-layer-title">CONTROL PLANE</p>
          <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6 }}>
            Pharma Data Factory governs engineering: Catalog, Create, Marketplace,
            Golden Paths, contracts, quality, compatibility, CI/CD, TechDocs,
            Search, RBAC, certification, versioning and Developer Hub.
          </p>
          <div className="pdf-diag-nodes">
            {CONTROL_PLANE_CAPABILITIES.map(label => (
              <span key={label} className="pdf-diag-node">
                {label}
              </span>
            ))}
          </div>
        </article>
        <article className="pdf-diag-layer">
          <p className="pdf-diag-layer-title">DATA PLANE</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            Independently deployed Data Products ingest from governed interfaces,
            apply contracts and quality, and serve consumers. The Control Plane
            does not process all operational data and is not required at runtime.
          </p>
        </article>
      </div>
    </div>
  );
}

export function SystemOfRecordToConsumerDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="System of Record to consumer path"
    >
      <div className="pdf-diag-flow">
        {['System of Record', 'Governed interface', 'Platform Components', 'Data Product', 'Consumer'].map(
          (label, index) => (
            <span key={label} style={{ display: 'contents' }}>
              {index > 0 ? (
                <div className="pdf-diag-arrow" aria-hidden="true">
                  →
                </div>
              ) : null}
              <span className="pdf-diag-node">{label}</span>
            </span>
          ),
        )}
      </div>
      <p style={{ margin: '16px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
        Direct database access is not the standard integration method. Source
        systems remain authoritative. Data Products are independently deployable.
      </p>
    </div>
  );
}

export function FutureIntelligenceDiagram() {
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label="Future Intelligence composition"
    >
      <p className="pdf-diag-layer-title">INTELLIGENCE — PLANNED</p>
      <div className="pdf-diag-nodes">
        {['RAG', 'LLM Gateway', 'Knowledge Graph', 'Vector Store'].map(label => (
          <span key={label} className="pdf-diag-node" style={{ gap: 8 }}>
            {label} <StoryStatusBadge status="PLANNED" />
          </span>
        ))}
      </div>
      <p style={{ margin: '16px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
        Intelligence components are not implemented. They are shown only as a
        future composition around governed Data Products.
      </p>
    </div>
  );
}

export function StoryDataProductCards() {
  return (
    <div className="pdf-diag" role="group" aria-label="Independently governed Data Products">
      <div className="pdf-diag-split">
        {STORY_DATA_PRODUCTS.map(product => (
          <article key={product.id} className="pdf-diag-layer" aria-label={`${product.name} Data Product`}>
            <p className="pdf-diag-layer-title">{product.name}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <StoryStatusBadge status={product.status} />
              {'protocol' in product ? (
                <span className="pdf-diag-node">{product.protocol}</span>
              ) : null}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Contract · Quality · Compatibility · CI/CD · Version · Owner
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
