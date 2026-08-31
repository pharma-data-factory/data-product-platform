export type EcosystemLocale = 'en' | 'de';

export interface JourneyCard {
  id: string;
  title: string;
  tagline: string;
  body: string;
  cta: string;
  href: string;
}

export interface MarketplaceCard {
  name: string;
  kind: string;
  status: 'available' | 'certified' | 'preview' | 'example';
  statusLabel: string;
  description: string;
}

export interface TrustLevel {
  name: string;
  tagline: string;
  body: string;
}

export interface AcademyPath {
  title: string;
  body: string;
}

export interface Capability {
  title: string;
  text: string;
}

export interface EcosystemCopy {
  problem: {
    eyebrow: string;
    title: string;
    body: string;
    systems: string[];
    note: string;
  };
  platform: {
    eyebrow: string;
    title: string;
    body: string;
    belowLabel: string;
    below: string[];
    aboveLabel: string;
    above: string[];
    capabilitiesLabel: string;
    capabilities: Capability[];
  };
  journeys: {
    eyebrow: string;
    title: string;
    sub: string;
    audiences: JourneyCard[];
  };
  marketplace: {
    eyebrow: string;
    title: string;
    body: string;
    steps: string[];
    liveLabel: string;
    live: MarketplaceCard[];
    examplesLabel: string;
    examples: MarketplaceCard[];
    cta: string;
  };
  build: {
    eyebrow: string;
    title: string;
    body: string;
    artifactsLabel: string;
    artifacts: string[];
    developerLabel: string;
    developer: string[];
    cta: string;
  };
  trust: {
    eyebrow: string;
    title: string;
    body: string;
    levels: TrustLevel[];
    aiTitle: string;
    aiBody: string;
    capabilitiesLabel: string;
    capabilities: string[];
  };
  academy: {
    eyebrow: string;
    title: string;
    sub: string;
    featuredLabel: string;
    featured: AcademyPath[];
    rolesLabel: string;
    roles: AcademyPath[];
    note: string;
  };
  flywheel: {
    eyebrow: string;
    title: string;
    steps: string[];
  };
  enterprise: {
    eyebrow: string;
    title: string;
    body: string;
    services: string[];
    cta: string;
  };
}

const SYSTEMS = [
  'MES',
  'ERP',
  'LIMS',
  'SCADA',
  'Historian',
  'IoT',
  'Data Platforms',
  'Custom Apps',
  'Point-to-point Integrations',
] as const;

const en: EcosystemCopy = {
  problem: {
    eyebrow: 'The problem',
    title: 'You already have the systems. You keep rebuilding the connections.',
    body: 'Every site wires MES to ERP, LIMS to the historian, IoT to the data lake — one bespoke integration at a time. Every new dashboard, quality report or OEE KPI becomes its own project, its own code, its own audit burden. The systems are not the problem. The repeated rebuilding is.',
    systems: [...SYSTEMS],
    note: 'Nexora does not replace your systems — it removes the repeat work between them.',
  },
  platform: {
    eyebrow: 'The Nexora platform',
    title: 'A governed layer between your systems and what you build.',
    body: 'Nexora connects enterprise systems, manufacturing systems, equipment and OT, and data & AI through one governance layer — and on top of it you build reusable capabilities.',
    belowLabel: 'Your systems',
    below: [
      'Enterprise — ERP · SAP · CRM',
      'Manufacturing — MES · LIMS · EWM',
      'Equipment & OT — SCADA · PLC · OPC UA',
      'Data & AI — Historian · Data Platform · Analytics',
    ],
    aboveLabel: 'What you build',
    above: ['Apps', 'Plugins', 'Data Products', 'Connectors', 'Workflows', 'Templates'],
    capabilitiesLabel: 'The platform capabilities',
    capabilities: [
      { title: 'CONNECT', text: 'Operational and enterprise data sources.' },
      { title: 'CREATE', text: 'Standardized capabilities via certified Golden Paths.' },
      { title: 'TRUST', text: 'Versioned contracts, quality gates, compatibility checks.' },
      { title: 'GOVERN', text: 'Ownership, RBAC, certification, lifecycle.' },
      { title: 'DISCOVER', text: 'Catalog, search, TechDocs, Marketplace.' },
      { title: 'OPERATE', text: 'CI/CD, versioning, compliance, upgrades.' },
    ],
  },
  journeys: {
    eyebrow: 'Choose your journey',
    title: 'One platform. Five ways in.',
    sub: 'Nexora serves the whole manufacturing ecosystem — each audience gets its own path.',
    audiences: [
      {
        id: 'life-sciences',
        title: 'Life Sciences',
        tagline: 'Accelerate digital manufacturing without another monolithic system.',
        body: 'Keep MES, ERP, LIMS and EWM standard. Add governed capabilities around them — in weeks, not months.',
        cta: 'See the platform',
        href: '#platform',
      },
      {
        id: 'enterprise-it',
        title: 'Enterprise IT',
        tagline: 'Run your own internal manufacturing platform.',
        body: 'Standardized APIs, plugins, templates and governance for your internal manufacturing and integration layer.',
        cta: 'Explore Enterprise',
        href: '#enterprise',
      },
      {
        id: 'consultants',
        title: 'Consultants & Integrators',
        tagline: 'Build once. Reuse across customers.',
        body: 'Ship plugins, accelerators and customer solutions on one platform — instead of rebuilding a stack every engagement.',
        cta: 'Build on Nexora',
        href: '#build',
      },
      {
        id: 'partners',
        title: 'Technology Partners',
        tagline: 'Integrate once. Reach many.',
        body: 'Publish connectors and integrations to a curated marketplace and make your technology available to Life Sciences customers.',
        cta: 'Explore the Marketplace',
        href: '#marketplace',
      },
      {
        id: 'developers',
        title: 'Developers',
        tagline: 'Ship capabilities, not plumbing.',
        body: 'Golden Paths, templates, APIs and documentation — you write the domain logic, Nexora ships the rest.',
        cta: 'Build on Nexora',
        href: '#build',
      },
    ],
  },
  marketplace: {
    eyebrow: 'Marketplace',
    title: 'Discover. Install. Configure. Govern.',
    body: 'The Nexora Marketplace is where manufacturing capabilities become reusable. Browse what is live today, and see where the ecosystem is heading.',
    steps: ['Discover', 'Install', 'Configure', 'Govern'],
    liveLabel: 'Live on the marketplace today',
    live: [
      {
        name: 'OEE Data Product',
        kind: 'Data Product',
        status: 'certified',
        statusLabel: 'CERTIFIED',
        description: 'Overall Equipment Effectiveness for one asset and time window: Availability × Performance × Quality.',
      },
      {
        name: 'AAS Asset Administration Shell',
        kind: 'Data Product',
        status: 'certified',
        statusLabel: 'CERTIFIED',
        description: 'IEC 63278 / IDTA-01001 v3.0 asset registry and semantic asset management.',
      },
      {
        name: 'MQTT Temperature Data Product',
        kind: 'Data Product',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Versioned temperature product from MQTT telemetry — contract, quality gate, REST API.',
      },
      {
        name: 'REST Equipment Data Product',
        kind: 'Data Product',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Canonical equipment identity and state over REST.',
      },
      {
        name: 'MQTT Connector',
        kind: 'Connector',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Environment-based MQTT broker connectivity.',
      },
      {
        name: 'Unified Namespace',
        kind: 'Platform Component',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Reusable MQTT Unified Namespace building block.',
      },
    ],
    examplesLabel: 'Example — coming to the marketplace',
    examples: [
      {
        name: 'SAP Manufacturing Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Selected SAP manufacturing and logistics objects as a versioned product.',
      },
      {
        name: 'OPC UA Equipment Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Poll OPC UA servers into a governed equipment product.',
      },
      {
        name: 'LIMS Integration',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Batch and sample context from LIMS as a reusable contract.',
      },
      {
        name: 'Historian Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Versioned time-series feeds from the historian.',
      },
      {
        name: 'AI Quality Assistant',
        kind: 'Application',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'AI-assisted review readiness for quality evidence.',
      },
    ],
    cta: 'Open the Marketplace',
  },
  build: {
    eyebrow: 'Build on Nexora',
    title: 'Build capabilities. Not plumbing.',
    body: 'Everything on Nexora is an extension of the platform — built once, governed, and reusable across sites and customers.',
    artifactsLabel: 'What you can build',
    artifacts: ['Plugins', 'Connectors', 'Applications', 'Data Products', 'Workflows', 'Templates'],
    developerLabel: 'The developer surface',
    developer: ['SDK', 'APIs', 'Golden Paths', 'Developer Portal', 'Documentation'],
    cta: 'Start Building',
  },
  trust: {
    eyebrow: 'Trust & governance',
    title: 'Four levels of trust. One governance layer.',
    body: 'Nexora governs how capabilities are built, released, discovered and operated. Every capability carries a trust level that tells you exactly how far it has been verified.',
    levels: [
      {
        name: 'Community',
        tagline: 'Published by the ecosystem',
        body: 'Self-service publishing with baseline automated checks — security, dependencies, licensing and documentation. Not yet reviewed by Nexora.',
      },
      {
        name: 'Verified',
        tagline: 'Reviewed for interoperability',
        body: 'Nexora or an accredited partner has reviewed API and contract standards, quality and compatibility. Safe to adopt.',
      },
      {
        name: 'Enterprise Ready',
        tagline: 'Built for production',
        body: 'Verified, hardened for production, with support, SLAs and a commercial entitlement.',
      },
      {
        name: 'Validation Ready',
        tagline: 'Engineered for regulated environments',
        body: 'Traceability, evidence generation, version control and test evidence — AI-assisted validation readiness, not validation.',
      },
    ],
    aiTitle: 'AI-assisted validation readiness',
    aiBody: "Nexora's AI assistance helps teams generate, organize and verify the evidence a validation package needs — traceability, test coverage, documentation completeness. It accelerates readiness. It does not perform validation, and it does not replace qualified human review, CSV, or regulatory sign-off.",
    capabilitiesLabel: 'Governance capabilities',
    capabilities: [
      'Security scanning',
      'Architecture compliance',
      'API standards',
      'Dependency checks',
      'Automated testing',
      'Documentation checks',
      'Traceability',
      'Release governance',
      'Evidence generation',
    ],
  },
  academy: {
    eyebrow: 'Nexora Academy',
    title: 'Learn by building.',
    sub: 'Application-oriented learning for customers, enterprise IT, consultants, developers and technology partners.',
    featuredLabel: 'Hands-on paths',
    featured: [
      { title: 'Build your first Nexora Plugin', body: 'From an empty repository to a governed plugin in the platform.' },
      { title: 'Build an OPC UA Manufacturing Connector', body: 'Turn machine telemetry into a reusable, versioned connector.' },
      { title: 'Create an OEE Application', body: 'Compose Availability × Performance × Quality into a product.' },
      { title: 'Publish to the Nexora Marketplace', body: 'Package, document and publish a capability the ecosystem can reuse.' },
    ],
    rolesLabel: 'Role-based learning paths',
    roles: [
      { title: 'Nexora Platform Fundamentals', body: 'What the open manufacturing platform is and how it fits around your systems.' },
      { title: 'Manufacturing Platform Engineering', body: 'Design governed capabilities on top of standard ERP, MES and LIMS.' },
      { title: 'Platform Administrator', body: 'Operate governance, RBAC and upgrade management.' },
      { title: 'Life Sciences Validation & Governance', body: 'Understand traceability and validation readiness.' },
      { title: 'Consultant Enablement', body: 'Build once, reuse across customer engagements.' },
    ],
    note: 'Learning paths, hands-on labs, sandbox environments, certifications and partner accreditation are on the roadmap and are not available in the current release.',
  },
  flywheel: {
    eyebrow: 'Ecosystem',
    title: 'The flywheel that grows itself.',
    steps: [
      'Companies need capabilities',
      'Consultants and developers build them',
      'The Marketplace distributes them',
      'Nexora governs them',
      'More companies reuse them',
      'The ecosystem grows',
    ],
  },
  enterprise: {
    eyebrow: 'Enterprise',
    title: 'Commercial services for enterprises.',
    body: 'Beyond the open platform, Nexora offers the commercial services regulated manufacturers and large IT organizations need.',
    services: [
      'Enterprise support',
      'Private marketplace',
      'Managed Nexora',
      'Enterprise governance',
      'SSO / RBAC',
      'Audit capabilities',
      'Validated deployment packages',
      'Premium plugins',
      'Professional services',
      'Partner enablement',
    ],
    cta: 'Talk to us',
  },
};

const de: EcosystemCopy = {
  problem: {
    eyebrow: 'Das Problem',
    title: 'Sie haben die Systeme. Sie bauen die Verbindungen immer wieder neu.',
    body: 'Jeder Standort verdrahtet MES mit ERP, LIMS mit dem Historian, IoT mit dem Data Lake — eine individuelle Integration nach der anderen. Jedes neue Dashboard, jeder Qualitätsreport, jede OEE-Kennzahl wird zum eigenen Projekt mit eigenem Code und eigener Audit-Last. Die Systeme sind nicht das Problem. Das ständige Neu-Bauen ist es.',
    systems: [...SYSTEMS],
    note: 'Nexora ersetzt Ihre Systeme nicht — es beseitigt die wiederholte Arbeit dazwischen.',
  },
  platform: {
    eyebrow: 'Die Nexora-Plattform',
    title: 'Eine gesteuerte Schicht zwischen Ihren Systemen und dem, was Sie bauen.',
    body: 'Nexora verbindet Unternehmenssysteme, Fertigungssysteme, Equipment und OT sowie Daten & KI über eine Governance-Schicht — und darauf bauen Sie wiederverwendbare Fähigkeiten.',
    belowLabel: 'Ihre Systeme',
    below: [
      'Enterprise — ERP · SAP · CRM',
      'Manufacturing — MES · LIMS · EWM',
      'Equipment & OT — SCADA · PLC · OPC UA',
      'Data & AI — Historian · Data Platform · Analytics',
    ],
    aboveLabel: 'Was Sie bauen',
    above: ['Apps', 'Plugins', 'Data Products', 'Connectors', 'Workflows', 'Templates'],
    capabilitiesLabel: 'Die Plattform-Fähigkeiten',
    capabilities: [
      { title: 'VERBINDEN', text: 'Betriebliche und unternehmensweite Datenquellen.' },
      { title: 'ERSTELLEN', text: 'Standardisierte Fähigkeiten über zertifizierte Golden Paths.' },
      { title: 'VERTRAUEN', text: 'Versionierte Contracts, Quality Gates, Compatibility Checks.' },
      { title: 'STEUERN', text: 'Ownership, RBAC, Zertifizierung, Lifecycle.' },
      { title: 'FINDEN', text: 'Katalog, Suche, TechDocs, Marketplace.' },
      { title: 'BETREIBEN', text: 'CI/CD, Versionierung, Compliance, Upgrades.' },
    ],
  },
  journeys: {
    eyebrow: 'Ihr Einstieg',
    title: 'Eine Plattform. Fünf Wege hinein.',
    sub: 'Nexora bedient das gesamte Manufacturing-Ökosystem — jede Zielgruppe bekommt ihren eigenen Pfad.',
    audiences: [
      {
        id: 'life-sciences',
        title: 'Life Sciences',
        tagline: 'Digitale Fertigung beschleunigen — ohne ein weiteres monolithisches System.',
        body: 'MES, ERP, LIMS und EWM bleiben Standard. Gesteuerte Fähigkeiten kommen in Wochen statt Monaten dazu.',
        cta: 'Plattform ansehen',
        href: '#platform',
      },
      {
        id: 'enterprise-it',
        title: 'Enterprise IT',
        tagline: 'Betreiben Sie Ihre eigene interne Manufacturing-Plattform.',
        body: 'Standardisierte APIs, Plugins, Templates und Governance für Ihre interne Fertigungs- und Integrationsschicht.',
        cta: 'Enterprise entdecken',
        href: '#enterprise',
      },
      {
        id: 'consultants',
        title: 'Consultants & Integratoren',
        tagline: 'Einmal bauen. Kundenübergreifend wiederverwenden.',
        body: 'Plugins, Accelerators und Kundenlösungen auf einer Plattform — statt bei jedem Projekt einen neuen Stack aufzubauen.',
        cta: 'Auf Nexora bauen',
        href: '#build',
      },
      {
        id: 'partners',
        title: 'Technologie-Partner',
        tagline: 'Einmal integrieren. Viele erreichen.',
        body: 'Publizieren Sie Konnektoren und Integrationen in einen kuratierten Marketplace und machen Sie Ihre Technologie für Life-Sciences-Kunden verfügbar.',
        cta: 'Marketplace ansehen',
        href: '#marketplace',
      },
      {
        id: 'developers',
        title: 'Entwickler',
        tagline: 'Fähigkeiten liefern, nicht Plumbing.',
        body: 'Golden Paths, Templates, APIs und Dokumentation — Sie schreiben die Domain-Logik, Nexora liefert den Rest.',
        cta: 'Auf Nexora bauen',
        href: '#build',
      },
    ],
  },
  marketplace: {
    eyebrow: 'Marketplace',
    title: 'Entdecken. Installieren. Konfigurieren. Steuern.',
    body: 'Der Nexora Marketplace macht Manufacturing-Fähigkeiten wiederverwendbar. Sehen Sie, was heute live ist, und wohin sich das Ökosystem entwickelt.',
    steps: ['Entdecken', 'Installieren', 'Konfigurieren', 'Steuern'],
    liveLabel: 'Heute live im Marketplace',
    live: [
      {
        name: 'OEE Data Product',
        kind: 'Data Product',
        status: 'certified',
        statusLabel: 'CERTIFIED',
        description: 'Overall Equipment Effectiveness für ein Asset und ein Zeitfenster: Verfügbarkeit × Leistung × Qualität.',
      },
      {
        name: 'AAS Asset Administration Shell',
        kind: 'Data Product',
        status: 'certified',
        statusLabel: 'CERTIFIED',
        description: 'Asset-Registry und semantisches Asset-Management nach IEC 63278 / IDTA-01001 v3.0.',
      },
      {
        name: 'MQTT Temperature Data Product',
        kind: 'Data Product',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Versioniertes Temperatur-Product aus MQTT-Telemetrie — Contract, Quality Gate, REST-API.',
      },
      {
        name: 'REST Equipment Data Product',
        kind: 'Data Product',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Kanonische Equipment-Identität und Zustand per REST.',
      },
      {
        name: 'MQTT Connector',
        kind: 'Connector',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Umgebungsbasierte MQTT-Broker-Anbindung.',
      },
      {
        name: 'Unified Namespace',
        kind: 'Platform Component',
        status: 'available',
        statusLabel: 'AVAILABLE',
        description: 'Wiederverwendbarer MQTT-Unified-Namespace-Baustein.',
      },
    ],
    examplesLabel: 'Beispiel — kommt in den Marketplace',
    examples: [
      {
        name: 'SAP Manufacturing Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Ausgewählte SAP-Fertigungs- und Logistikobjekte als versioniertes Product.',
      },
      {
        name: 'OPC UA Equipment Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'OPC-UA-Server in ein gesteuertes Equipment-Product überführen.',
      },
      {
        name: 'LIMS Integration',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Chargen- und Probenkontext aus dem LIMS als wiederverwendbarer Contract.',
      },
      {
        name: 'Historian Connector',
        kind: 'Connector',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'Versionierte Zeitreihen-Feeds aus dem Historian.',
      },
      {
        name: 'AI Quality Assistant',
        kind: 'Application',
        status: 'example',
        statusLabel: 'EXAMPLE',
        description: 'KI-gestützte Review-Readiness für Qualitäts-Evidenz.',
      },
    ],
    cta: 'Marketplace öffnen',
  },
  build: {
    eyebrow: 'Auf Nexora bauen',
    title: 'Fähigkeiten bauen. Nicht Plumbing.',
    body: 'Alles auf Nexora ist eine Erweiterung der Plattform — einmal gebaut, gesteuert und über Standorte und Kunden hinweg wiederverwendbar.',
    artifactsLabel: 'Was Sie bauen können',
    artifacts: ['Plugins', 'Connectors', 'Applications', 'Data Products', 'Workflows', 'Templates'],
    developerLabel: 'Die Entwickler-Oberfläche',
    developer: ['SDK', 'APIs', 'Golden Paths', 'Developer Portal', 'Dokumentation'],
    cta: 'Jetzt bauen',
  },
  trust: {
    eyebrow: 'Trust & Governance',
    title: 'Vier Vertrauensstufen. Eine Governance-Schicht.',
    body: 'Nexora steuert, wie Fähigkeiten gebaut, freigegeben, gefunden und betrieben werden. Jede Fähigkeit trägt eine Vertrauensstufe, die genau sagt, wie weit sie verifiziert ist.',
    levels: [
      {
        name: 'Community',
        tagline: 'Vom Ökosystem publiziert',
        body: 'Self-Service-Publishing mit automatisierten Basis-Checks — Sicherheit, Abhängigkeiten, Lizenzen und Dokumentation. Noch nicht von Nexora geprüft.',
      },
      {
        name: 'Verified',
        tagline: 'Auf Interoperabilität geprüft',
        body: 'Nexora oder ein akkreditierter Partner hat API- und Contract-Standards, Qualität und Kompatibilität geprüft. Sicher zu übernehmen.',
      },
      {
        name: 'Enterprise Ready',
        tagline: 'Für die Produktion gebaut',
        body: 'Verifiziert, produktionsgehärtet, mit Support, SLAs und kommerziellem Entitlement.',
      },
      {
        name: 'Validation Ready',
        tagline: 'Für regulierte Umgebungen entwickelt',
        body: 'Traceability, Evidence-Generierung, Versionierung und Test-Evidenz — KI-gestützte Validation-Readiness, keine Validierung.',
      },
    ],
    aiTitle: 'KI-gestützte Validation-Readiness',
    aiBody: 'Die KI-Unterstützung von Nexora hilft Teams, die Evidenz zu erzeugen, zu ordnen und zu prüfen, die ein Validation-Paket braucht — Traceability, Testabdeckung, Dokumentationsvollständigkeit. Sie beschleunigt die Readiness. Sie führt keine Validierung durch und ersetzt weder menschliche Prüfung noch CSV oder regulatorische Freigabe.',
    capabilitiesLabel: 'Governance-Fähigkeiten',
    capabilities: [
      'Security-Scanning',
      'Architektur-Compliance',
      'API-Standards',
      'Dependency-Checks',
      'Automatisiertes Testen',
      'Dokumentations-Checks',
      'Traceability',
      'Release-Governance',
      'Evidence-Generierung',
    ],
  },
  academy: {
    eyebrow: 'Nexora Academy',
    title: 'Lernen durch Bauen.',
    sub: 'Anwendungsorientiertes Lernen für Kunden, Enterprise-IT, Consultants, Entwickler und Technologie-Partner.',
    featuredLabel: 'Hands-on-Pfade',
    featured: [
      { title: 'Baue dein erstes Nexora-Plugin', body: 'Vom leeren Repository zum gesteuerten Plugin in der Plattform.' },
      { title: 'Baue einen OPC-UA-Manufacturing-Connector', body: 'Maschinen-Telemetrie in einen wiederverwendbaren, versionierten Connector verwandeln.' },
      { title: 'Erstelle eine OEE-Anwendung', body: 'Verfügbarkeit × Leistung × Qualität zu einem Product zusammensetzen.' },
      { title: 'Publiziere im Nexora Marketplace', body: 'Eine Fähigkeit paketieren, dokumentieren und für das Ökosystem veröffentlichen.' },
    ],
    rolesLabel: 'Rollenbasierte Lernpfade',
    roles: [
      { title: 'Nexora Platform Fundamentals', body: 'Was die offene Manufacturing-Plattform ist und wie sie sich um Ihre Systeme legt.' },
      { title: 'Manufacturing Platform Engineering', body: 'Gesteuerte Fähigkeiten auf Standard-ERP, -MES und -LIMS entwerfen.' },
      { title: 'Platform Administrator', body: 'Governance, RBAC und Upgrade-Management betreiben.' },
      { title: 'Life Sciences Validation & Governance', body: 'Traceability und Validation-Readiness verstehen.' },
      { title: 'Consultant Enablement', body: 'Einmal bauen, kundenübergreifend wiederverwenden.' },
    ],
    note: 'Lernpfade, Hands-on-Labs, Sandbox-Umgebungen, Zertifizierungen und Partner-Akkreditierung sind auf der Roadmap und im aktuellen Release noch nicht verfügbar.',
  },
  flywheel: {
    eyebrow: 'Ökosystem',
    title: 'Der Flywheel, der sich selbst verstärkt.',
    steps: [
      'Unternehmen brauchen Fähigkeiten',
      'Consultants und Entwickler bauen sie',
      'Der Marketplace verteilt sie',
      'Nexora steuert sie',
      'Mehr Unternehmen nutzen sie',
      'Das Ökosystem wächst',
    ],
  },
  enterprise: {
    eyebrow: 'Enterprise',
    title: 'Kommerzielle Services für Unternehmen.',
    body: 'Über die offene Plattform hinaus bietet Nexora die kommerziellen Services, die regulierte Hersteller und große IT-Organisationen brauchen.',
    services: [
      'Enterprise-Support',
      'Private Marketplace',
      'Managed Nexora',
      'Enterprise-Governance',
      'SSO / RBAC',
      'Audit-Fähigkeiten',
      'Validierte Deployment-Pakete',
      'Premium-Plugins',
      'Professional Services',
      'Partner-Enablement',
    ],
    cta: 'Jetzt sprechen',
  },
};

export const ecosystemCopy: Record<EcosystemLocale, EcosystemCopy> = { en, de };
