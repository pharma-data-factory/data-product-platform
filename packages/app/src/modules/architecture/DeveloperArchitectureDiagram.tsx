import { C, PHARMA_NAVY, PHARMA_TEAL } from '../identity/landingTokens';

function Box({
  x,
  y,
  width,
  height,
  fill,
  label,
  sub,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  label: string;
  sub?: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        fill={fill}
        stroke={fill === PHARMA_NAVY || fill === PHARMA_TEAL ? fill : C.border}
      />
      <text
        x={x + width / 2}
        y={sub ? y + height / 2 - 5 : y + height / 2 + 4}
        textAnchor="middle"
        fill={fill === '#FFFFFF' || fill === '#F8FAFC' || fill === '#EEF2F6' ? PHARMA_NAVY : '#F8FAFC'}
        fontSize={13}
        fontWeight={700}
        fontFamily="Space Grotesk, Inter, sans-serif"
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 13}
          textAnchor="middle"
          fill={fill === PHARMA_NAVY ? '#CBD5E1' : '#64748B'}
          fontSize={11}
          fontFamily="JetBrains Mono, ui-monospace, monospace"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export function DeveloperArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 920 720"
      role="img"
      aria-label="Developer architecture: Pharma Data Factory Control Plane with Catalog, Marketplace and Create leading to a Golden Path, composition manifest, Platform Components, generated Data Product and independent runtime"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <rect width="920" height="720" fill="#071525" />
      <Box
        x={200}
        y={20}
        width={520}
        height={58}
        fill={PHARMA_NAVY}
        label="PHARMA DATA FACTORY"
        sub="CONTROL PLANE"
      />
      <line x1="460" y1="78" x2="460" y2="108" stroke={PHARMA_TEAL} />
      <line x1="160" y1="108" x2="760" y2="108" stroke={PHARMA_TEAL} />
      <line x1="160" y1="108" x2="160" y2="124" stroke={PHARMA_TEAL} />
      <line x1="460" y1="108" x2="460" y2="124" stroke={PHARMA_TEAL} />
      <line x1="760" y1="108" x2="760" y2="124" stroke={PHARMA_TEAL} />
      <Box x={40} y={124} width={240} height={48} fill="#123152" label="Catalog" />
      <Box x={340} y={124} width={240} height={48} fill="#123152" label="Marketplace" />
      <Box x={640} y={124} width={240} height={48} fill="#123152" label="Create" />
      <line x1="460" y1="172" x2="460" y2="188" stroke={PHARMA_TEAL} />
      <line x1="760" y1="172" x2="760" y2="188" stroke={PHARMA_TEAL} />
      <line x1="460" y1="188" x2="760" y2="188" stroke={PHARMA_TEAL} />
      <line x1="610" y1="188" x2="610" y2="208" stroke={PHARMA_TEAL} />
      <Box
        x={250}
        y={208}
        width={420}
        height={52}
        fill={PHARMA_TEAL}
        label="GOLDEN PATH"
        sub="certified composition pattern"
      />
      <text
        x="460"
        y="286"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="12"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
      >
        composition manifest
      </text>
      <line x1="460" y1="294" x2="460" y2="312" stroke={PHARMA_TEAL} />
      <Box
        x={160}
        y={312}
        width={600}
        height={56}
        fill="#123152"
        label="PLATFORM COMPONENTS"
        sub="MQTT Consumer · REST Source · REST API · Health · Observability"
      />
      <line x1="280" y1="368" x2="280" y2="392" stroke={PHARMA_TEAL} />
      <line x1="640" y1="368" x2="640" y2="392" stroke={PHARMA_TEAL} />
      <Box
        x={80}
        y={392}
        width={320}
        height={52}
        fill="#0E243C"
        label="AAS / Semantics"
        sub="what the asset means"
      />
      <Box
        x={520}
        y={392}
        width={320}
        height={52}
        fill="#0E243C"
        label="UNS / MQTT / REST"
        sub="where data flows"
      />
      <line x1="240" y1="444" x2="240" y2="468" stroke={PHARMA_TEAL} />
      <line x1="680" y1="444" x2="680" y2="468" stroke={PHARMA_TEAL} />
      <line x1="240" y1="468" x2="680" y2="468" stroke={PHARMA_TEAL} />
      <line x1="460" y1="468" x2="460" y2="488" stroke={PHARMA_TEAL} />
      <Box
        x={180}
        y={488}
        width={560}
        height={56}
        fill={PHARMA_TEAL}
        label="GENERATED DATA PRODUCT"
        sub="GitHub · CI/CD · Docker · Contract · Quality"
      />
      <line x1="160" y1="172" x2="160" y2="572" stroke="rgba(148,163,184,0.45)" />
      <line x1="160" y1="572" x2="300" y2="572" stroke="rgba(148,163,184,0.45)" />
      <text
        x="150"
        y="560"
        textAnchor="end"
        fill="#94A3B8"
        fontSize="11"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
      >
        Catalog registers
      </text>
      <line x1="460" y1="544" x2="460" y2="568" stroke={PHARMA_TEAL} />
      <Box
        x={260}
        y={568}
        width={400}
        height={48}
        fill="#EEF2F6"
        label="INDEPENDENT RUNTIME"
        sub="does not require the Control Plane"
      />
      <line x1="460" y1="616" x2="460" y2="640" stroke={PHARMA_TEAL} />
      <Box x={300} y={640} width={320} height={44} fill="#F8FAFC" label="CONSUMERS" />
    </svg>
  );
}
