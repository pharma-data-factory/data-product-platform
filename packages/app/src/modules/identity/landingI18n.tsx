import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  LEARN_ASSEMBLY_STEPS,
  LEARN_TOPICS,
  PLATFORM_CAPABILITIES,
  PRODUCT_EDITIONS,
} from '@internal/platform-common';
import { ARCHITECTURE_CONCEPTS } from '../architecture/constants';

export const LANDING_LOCALE_STORAGE_KEY = 'pdf.landing.locale';

export const LANDING_LOCALES = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'de', label: 'Deutsch', short: 'DE' },
] as const;

export type LandingLocaleId = (typeof LANDING_LOCALES)[number]['id'];

type LearnTopicCopy = { title: string; summary: string };

export interface LandingCopy {
  language: string;
  bookDemo: string;
  signIn: string;
  openMenu: string;
  closeMenu: string;
  nav: {
    platform: string;
    developers: string;
    learn: string;
    editions: string;
    goldenPaths: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    primary: string;
    secondary: string;
  };
  why: {
    eyebrow: string;
    title: string;
    body: string;
    forWhom: string;
    systemOfRecord: string;
    dataProduct: string;
    controlPlane: string;
  };
  developer: {
    eyebrow: string;
    title: string;
    headline: string;
    platformLabel: string;
    developerLabel: string;
    resultLabel: string;
    platformItems: readonly string[];
    domainItem: string;
    cta: string;
  };
  preview: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    systems: string;
    governed: string;
    components: string;
    goldenPaths: string;
    products: string;
  };
  proof: {
    eyebrow: string;
    title: string;
    oeeCaption: string;
    oee: string;
    mes: string;
    machine: string;
    rest: string;
    mqtt: string;
    formula: string;
    api: string;
    mqttCard: string;
    restCard: string;
  };
  learn: {
    eyebrow: string;
    title: string;
    sub: string;
    availableToday: string;
    assemblyLabel: string;
    topics: Record<string, LearnTopicCopy>;
    assemblySteps: readonly string[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    sub: string;
    customerHosted: string;
    managed: string;
    includes: string;
    everythingIn: (name: string) => string;
    contact: string;
    contactNote: string;
    editions: Record<
      string,
      {
        bestFor: string;
        priceLabel: string;
        priceHint: string;
        cta: string;
        includes: readonly string[];
      }
    >;
  };
  footer: {
    tagline: string;
    note: string;
  };
  overview: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    concepts: Record<string, { title: string; body: string }>;
  };
  principle: {
    eyebrow: string;
    title: string;
    body1: string;
    body2: string;
    finale: string;
    benefits: readonly string[];
    certified: string;
    illustrative: string;
    vizLabel: string;
    layerStandard: string;
    layerStable: string;
    layerInterfaces: string;
    layerProducts: string;
    sectionLabel: string;
    benefitsLabel: string;
    srOnly: string;
    mapsTo: string;
    dataProductKind: string;
    layers: {
      standard: string;
      aas: string;
      uns: string;
      components: string;
      goldenPaths: string;
      products: string;
      factory: string;
    };
    captions: {
      stableCore: string;
      systemsOfRecord: string;
      aas: string;
      uns: string;
      goldenCompose: string;
      goldenExamples: string;
      dataProduct: string;
      controlPlane: string;
    };
  };
  storyCta: {
    primary: string;
    secondary: string;
  };
  platform: {
    eyebrow: string;
    title: string;
    sub: string;
    groupTitle: string;
    kind: string;
    badge: string;
    explore: string;
    capabilities: Record<string, { title: string; text: string }>;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    sub: string;
    journey: string;
    steps: readonly string[];
    sentences: readonly string[];
  };
  goldenPaths: {
    eyebrow: string;
    title: string;
    sub: string;
    certifiedGroup: string;
    plannedTitle: string;
    plannedSub: string;
    kindCertified: string;
    kindPlanned: string;
    explore: string;
    unavailable: string;
    items: Record<string, { description: string }>;
  };
  finalCta: {
    title: string;
    sub: string;
  };
}

const EN_LEARN_TOPICS = Object.fromEntries(
  LEARN_TOPICS.map(topic => [topic.id, { title: topic.title, summary: topic.summary }]),
) as Record<string, LearnTopicCopy>;

const EN_EDITIONS = Object.fromEntries(
  PRODUCT_EDITIONS.map(edition => [
    edition.id,
    {
      bestFor: edition.bestFor,
      priceLabel: edition.priceLabel,
      priceHint: edition.priceHint,
      cta: edition.cta,
      includes:
        edition.availability === 'future'
          ? edition.futureCapabilities ?? []
          : edition.includes,
    },
  ]),
);

const EN_CAPABILITIES = Object.fromEntries(
  PLATFORM_CAPABILITIES.map(item => [item.id, { title: item.title, text: item.text }]),
);

const EN_CONCEPTS = Object.fromEntries(
  ARCHITECTURE_CONCEPTS.map(item => [item.id, { title: item.title, body: item.body }]),
);

const EN_HOW_IT_WORKS_STEPS = [
  'Connect',
  'Understand',
  'Compose',
  'Build',
  'Govern',
  'Consume',
] as const;

const EN_HOW_IT_WORKS_SENTENCES = [
  'REST, MQTT, and IT/OT stay at the edge.',
  'Assets and meaning stay governed.',
  'Reusable capabilities are certified once.',
  'Golden Paths generate the Data Product.',
  'Quality, compatibility, and CI/CD are default.',
  'APIs and applications bind to the contract.',
] as const;

const EN_ARCHITECTURE_BENEFITS = [
  'Reduce unnecessary core customization',
  'Decouple digital innovation from core release cycles',
  'Faster time to value',
  'Governed Data Products',
  'Independent versioning',
  'Reusable capabilities',
] as const;

const en: LandingCopy = {
  language: 'Language',
  bookDemo: 'Book a Demo',
  signIn: 'Sign In',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  nav: {
    platform: 'Platform',
    developers: 'Developers',
    learn: 'Learn',
    editions: 'Editions',
    goldenPaths: 'Golden Paths',
  },
  hero: {
    eyebrow: 'DATA PRODUCTS. BUILT FOR PHARMA.',
    title: 'Keep the core standard.\nInnovate through Data Products.',
    sub: 'Build governed industrial Data Products around ERP, MES, LIMS, EWM and IT/OT systems without turning the operational core into a customization layer.',
    primary: 'See how it works',
    secondary: 'See Golden Paths',
  },
  why: {
    eyebrow: 'Why it exists',
    title: 'Do not customize the operational core.',
    body: 'ERP, MES, LIMS and EWM remain systems of record, close to standard. Pharma Data Factory is the governed layer where Data Products evolve independently.',
    forWhom:
      'Designed for pharmaceutical, biotech, and CDMO teams that need Data Products without a large platform-engineering organization.',
    systemOfRecord: 'System of record',
    dataProduct: 'Data Product',
    controlPlane: 'Control Plane',
  },
  developer: {
    eyebrow: 'Developer value',
    title: 'Focus on domain value. Not platform plumbing.',
    headline: 'Focus on domain value. Not platform plumbing.',
    platformLabel: 'Platform provides',
    developerLabel: 'Developer provides',
    resultLabel: 'Governed Data Product',
    platformItems: [
      'MQTT',
      'REST',
      'Storage',
      'Health',
      'Observability',
      'Contracts',
      'CI/CD',
    ],
    domainItem: 'Domain logic',
    cta: 'How developers build',
  },
  preview: {
    eyebrow: 'Architecture',
    title: 'A governed layer around the systems you already run.',
    body: 'Explore how assets, operational flow, reusable capabilities and Golden Paths fit together.',
    cta: 'Explore Architecture',
    systems: 'ERP · MES · LIMS · EWM · PLC',
    governed: 'Governed layer',
    components: 'Platform Components',
    goldenPaths: 'Golden Paths',
    products: 'Data Products',
  },
  proof: {
    eyebrow: 'Proof',
    title: 'Certified Golden Paths you can run today.',
    oeeCaption: 'Built as an independent Data Product — not an MES customization.',
    oee: 'OEE Data Product',
    mes: 'MES',
    machine: 'Machine',
    rest: 'REST',
    mqtt: 'MQTT',
    formula: 'A × P × Q',
    api: 'REST API',
    mqttCard: 'MQTT ingest to a governed temperature product.',
    restCard: 'Equipment state over REST as a governed product.',
  },
  learn: {
    eyebrow: 'Learn',
    title: 'Data Products, in business terms',
    sub: 'A short vocabulary for manufacturing and IT leaders. Technical architecture lives on the architecture page.',
    availableToday: 'Available today',
    assemblyLabel: 'How Data Products are assembled from reusable capabilities',
    topics: EN_LEARN_TOPICS,
    assemblySteps: LEARN_ASSEMBLY_STEPS,
  },
  pricing: {
    eyebrow: 'Editions',
    title: 'Template, Platform, or SaaS',
    sub: 'Template is available as a controlled pilot. Platform is planned. SaaS is a future offering and is not available today.',
    customerHosted: 'Customer-hosted',
    managed: 'Managed',
    includes: 'Includes:',
    everythingIn: name => `Everything in ${name}, plus:`,
    contact: 'Contact us for enterprise pricing.',
    contactNote:
      'No public price list. Designed for future AWS Marketplace distribution. No live listing or checkout in this release.',
    editions: EN_EDITIONS,
  },
  footer: {
    tagline:
      'DATA PRODUCTS. BUILT FOR PHARMA. Technical certification is platform status only. It is not GxP or regulatory validation.',
    note: 'Single-organization Control Plane. SaaS multi-tenancy is future.',
  },
  overview: {
    eyebrow: 'FROM PRINCIPLE TO ARCHITECTURE',
    title: 'How Pharma Data Factory works',
    body: 'Pharma Data Factory creates a governed engineering layer for building, operating and discovering Data Products around existing ERP, MES, LIMS, EWM, Historian, CMO and other IT/OT platforms.',
    cta: 'Explore the Architecture',
    concepts: EN_CONCEPTS,
  },
  principle: {
    eyebrow: 'How it fits together',
    title: 'From stable core systems to governed Data Products.',
    body1:
      'Keep ERP, MES, LIMS, EWM, CMO platforms and other IT/OT systems stable and close to standard.',
    body2:
      'Pharma Data Factory adds a governed digital layer around those systems: assets are described semantically, operational data flows through governed interfaces, reusable components provide technical capabilities, and Golden Paths turn them into independently evolving Data Products.',
    finale: 'Keep core systems standard.\nCompose digital capabilities.\nDeliver governed Data Products.',
    benefits: EN_ARCHITECTURE_BENEFITS,
    certified: 'Certified',
    illustrative: 'Illustrative',
    vizLabel: 'Keep core systems standard and innovate through Data Products',
    layerStandard: 'Standard systems',
    layerStable: 'Standard & stable IT/OT core',
    layerInterfaces: 'Governed interfaces',
    layerProducts: 'Data products',
    sectionLabel: 'Architecture principle',
    benefitsLabel: 'Architecture benefits',
    srOnly:
      'Systems of record remain ERP, MES, LIMS, EWM, historian, CMO platforms, PLC, SCADA and other IT/OT. AAS explains what an asset is and what its data means. Unified Namespace governs where operational data flows. Certified Platform Components provide reusable capabilities. Golden Paths compose them into independently evolving Data Products. Pharma Data Factory is the Control Plane. It does not replace source systems, does not store time-series in AAS, and does not process all operational data.',
    mapsTo: 'maps to',
    dataProductKind: 'Data Product',
    layers: {
      standard: 'Standard systems',
      aas: 'Asset Administration / AAS',
      uns: 'Unified Namespace',
      components: 'Platform Components',
      goldenPaths: 'Golden Paths',
      products: 'Data products',
      factory: 'Pharma Data Factory',
    },
    captions: {
      stableCore: 'Standard & stable IT/OT core',
      systemsOfRecord: 'Systems of Record remain stable and close to standard.',
      aas: 'AAS explains what an asset is and what its data means. AAS does not store time-series values.',
      uns: 'UNS governs where and how operational data flows. AAS = meaning. UNS = data flow.',
      goldenCompose: 'Golden Paths compose certified capabilities',
      goldenExamples:
        'Official examples today: MQTT Temperature, REST Equipment, and OEE Data Product. Cold Chain, Quality, Energy and AI Assistant are future.',
      dataProduct:
        'A Data Product contains business value and can evolve independently from the operational core.',
      controlPlane:
        'The Control Plane governs how Data Products are built, released, discovered and operated. It does not process all operational data.',
    },
  },
  storyCta: {
    primary: 'Explore Platform Architecture',
    secondary: 'Explore Golden Paths',
  },
  platform: {
    eyebrow: 'Platform value',
    title: 'Six capabilities for governed data products',
    sub: 'A coherent commercial Control Plane — not a default Backstage portal.',
    groupTitle: 'Key Features',
    kind: 'Platform capability',
    badge: 'Key Feature',
    explore: 'Explore',
    capabilities: EN_CAPABILITIES,
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'From source systems to consumption',
    sub: 'One industrial path. One short sentence per stage.',
    journey: 'Product journey',
    steps: EN_HOW_IT_WORKS_STEPS,
    sentences: EN_HOW_IT_WORKS_SENTENCES,
  },
  goldenPaths: {
    eyebrow: 'Golden Paths',
    title: 'Certified manufacturing Golden Paths',
    sub: 'MQTT Temperature, REST Equipment, and OEE are technically CERTIFIED.',
    certifiedGroup: 'Certified templates',
    plannedTitle: 'Planned / future Golden Paths',
    plannedSub:
      'These examples are not implemented and are not available in the current MVP.',
    kindCertified: 'Golden Path template',
    kindPlanned: 'Planned template',
    explore: 'Explore',
    unavailable: 'Not available',
    items: {
      'mqtt-temperature': {
        description:
          'Ingest MQTT temperature telemetry, persist a governed time series, and expose a REST contract with health checks, tests, Docker, and catalog metadata.',
      },
      'rest-equipment': {
        description:
          'Poll equipment state over REST and publish a governed equipment Data Product with contract, tests, CI, and documentation.',
      },
      oee: {
        description:
          'Compose MES production context and machine MQTT events into Availability, Performance, Quality, and OEE. Mode A. Technical certification only, not GxP.',
      },
      snowflake: {
        description:
          'Planned warehouse connector Golden Path. Not implemented in this release. No live Snowflake connectivity.',
      },
      sap: {
        description:
          'Planned SAP connectivity Golden Path. Not implemented in this release. No live SAP connectivity.',
      },
      'cold-chain': {
        description:
          'Planned cold-chain monitoring Golden Path. Not implemented and not available in the current MVP.',
      },
    },
  },
  finalCta: {
    title: 'See the factory',
    sub: 'Book a demo or sign in to the Control Plane.',
  },
};

const de: LandingCopy = {
  language: 'Sprache',
  bookDemo: 'Demo vereinbaren',
  signIn: 'Anmelden',
  openMenu: 'Menü öffnen',
  closeMenu: 'Menü schließen',
  nav: {
    platform: 'Plattform',
    developers: 'Entwickler',
    learn: 'Wissen',
    editions: 'Editionen',
    goldenPaths: 'Golden Paths',
  },
  hero: {
    eyebrow: 'DATA PRODUCTS. BUILT FOR PHARMA.',
    title: 'Kernsysteme standardisiert halten.\nÜber Data Products innovieren.',
    sub: 'Bauen Sie gesteuerte industrielle Data Products um ERP, MES, LIMS, EWM und IT/OT — ohne den operativen Kern zur Customizing-Schicht zu machen.',
    primary: 'So funktioniert es',
    secondary: 'Golden Paths ansehen',
  },
  why: {
    eyebrow: 'Warum es existiert',
    title: 'Den operativen Kern nicht anpassen.',
    body: 'ERP, MES, LIMS und EWM bleiben Systeme of Record, nah am Standard. Pharma Data Factory ist die gesteuerte Schicht, in der Data Products unabhängig entstehen.',
    forWhom:
      'Für Pharma-, Biotech- und CDMO-Teams, die Data Products brauchen — ohne große Platform-Engineering-Organisation.',
    systemOfRecord: 'System of Record',
    dataProduct: 'Data Product',
    controlPlane: 'Control Plane',
  },
  developer: {
    eyebrow: 'Nutzen für Entwickler',
    title: 'Fokus auf Domain-Nutzen. Nicht auf Plattform-Plumbing.',
    headline: 'Fokus auf Domain-Nutzen. Nicht auf Plattform-Plumbing.',
    platformLabel: 'Die Plattform liefert',
    developerLabel: 'Der Entwickler liefert',
    resultLabel: 'Gesteuertes Data Product',
    platformItems: [
      'MQTT',
      'REST',
      'Storage',
      'Health',
      'Observability',
      'Contracts',
      'CI/CD',
    ],
    domainItem: 'Domain-Logik',
    cta: 'So bauen Entwickler',
  },
  preview: {
    eyebrow: 'Architektur',
    title: 'Eine gesteuerte Schicht um die Systeme, die Sie bereits betreiben.',
    body: 'Sehen Sie, wie Assets, Betriebsdaten, wiederverwendbare Fähigkeiten und Golden Paths zusammenpassen.',
    cta: 'Architektur ansehen',
    systems: 'ERP · MES · LIMS · EWM · PLC',
    governed: 'Gesteuerte Schicht',
    components: 'Platform Components',
    goldenPaths: 'Golden Paths',
    products: 'Data Products',
  },
  proof: {
    eyebrow: 'Nachweis',
    title: 'Zertifizierte Golden Paths, die Sie heute nutzen können.',
    oeeCaption: 'Als unabhängiges Data Product gebaut — nicht als MES-Customizing.',
    oee: 'OEE Data Product',
    mes: 'MES',
    machine: 'Maschine',
    rest: 'REST',
    mqtt: 'MQTT',
    formula: 'A × P × Q',
    api: 'REST API',
    mqttCard: 'MQTT-Ingest zu einem gesteuerten Temperatur-Product.',
    restCard: 'Equipment-Zustand per REST als gesteuertes Product.',
  },
  learn: {
    eyebrow: 'Wissen',
    title: 'Data Products, in Geschäftssprache',
    sub: 'Ein kurzes Vokabular für Fertigung und IT. Die technische Architektur steht auf der Architecture-Seite.',
    availableToday: 'Heute verfügbar',
    assemblyLabel: 'So werden Data Products aus wiederverwendbaren Fähigkeiten zusammengesetzt',
    topics: {
      'data-product': {
        title: 'Was ist ein Data Product?',
        summary:
          'Ein verwaltetes Datenangebot mit klarem Owner. Andere Teams finden es, vertrauen ihm und nutzen es — ohne ERP, MES oder LIMS zu verändern.',
      },
      'data-contract': {
        title: 'Was ist ein Data Contract?',
        summary:
          'Die Vereinbarung zu Bedeutung, Qualität und zulässiger Nutzung. Verbraucher verlassen sich auf den Contract, nicht auf informelle Extrakte.',
      },
      ownership: {
        title: 'Ownership',
        summary:
          'Ein Team ist für das Product verantwortlich. Qualität, Änderungen und Support bleiben beim Owner.',
      },
      assembly: {
        title: 'Wie Products zusammengesetzt werden',
        summary:
          'Wiederverwendbare Fähigkeiten werden zu zertifizierten Golden Paths kombiniert. Temperature und Equipment teilen denselben Kern; nur die Quelle ändert sich.',
      },
      'catalog-marketplace': {
        title: 'Katalog vs. Marketplace',
        summary:
          'Der Katalog zeigt, was bereits existiert. Im Marketplace starten Teams einen zertifizierten Golden Path.',
      },
    },
    assemblySteps: [
      'Quellen anbinden',
      'Contract und Qualität anwenden',
      'Data Product veröffentlichen',
    ],
  },
  pricing: {
    eyebrow: 'Editionen',
    title: 'Template, Platform oder SaaS',
    sub: 'Template ist als kontrollierter Pilot verfügbar. Platform ist geplant. SaaS ist ein zukünftiges Angebot und heute nicht verfügbar.',
    customerHosted: 'Kundenbetrieben',
    managed: 'Verwaltet',
    includes: 'Enthalten:',
    everythingIn: name => `Alles in ${name}, plus:`,
    contact: 'Kontaktieren Sie uns für Enterprise-Preise.',
    contactNote:
      'Keine öffentliche Preisliste. Ausgelegt für künftige AWS-Marketplace-Distribution. Kein Live-Listing und kein Checkout in diesem Release.',
    editions: {
      template: {
        bestFor: 'Ideal für Teams mit bestehender Engineering-Plattform',
        priceLabel: 'Pro Template',
        priceHint: 'Lizenz oder Abo',
        cta: 'Templates ansehen',
        includes: [
          'Zertifizierte Templates',
          'Data Contracts',
          'Quality Gates',
          'Compatibility Checks',
          'CI/CD',
          'Docker',
          'TechDocs',
        ],
      },
      platform: {
        bestFor: 'Ideal für Organisationen mit eigener Control Plane',
        priceLabel: 'Lassen Sie uns sprechen',
        priceHint: 'Jährliche Plattformlizenz',
        cta: 'Kontakt aufnehmen',
        includes: [
          'Marketplace',
          'Data Product Catalog',
          'Governance',
          'Search',
          'RBAC',
          'Upgrade Management',
          'Control Plane in der Kunden-Cloud',
        ],
      },
      saas: {
        bestFor: 'Ideal für Organisationen, die Data Product Factory as a Service wollen',
        priceLabel: 'Kommt später',
        priceHint: 'Managed Subscription',
        cta: 'Coming Later',
        includes: [
          'Managed Control Plane',
          'Kundenorganisationen',
          'Customer SSO',
          'Mandantenisolation',
          'Managed Upgrades',
          'Nutzungs- und Entitlement-Management',
          'Operational Monitoring',
        ],
      },
    },
  },
  footer: {
    tagline:
      'DATA PRODUCTS. BUILT FOR PHARMA. Technische Zertifizierung ist nur Plattformstatus. Sie ist keine GxP- oder regulatorische Validierung.',
    note: 'Control Plane für eine Organisation. SaaS-Mandantenfähigkeit ist Zukunft.',
  },
  overview: {
    eyebrow: 'VOM PRINZIP ZUR ARCHITEKTUR',
    title: 'So arbeitet Pharma Data Factory',
    body: 'Pharma Data Factory schafft eine gesteuerte Engineering-Schicht zum Bauen, Betreiben und Finden von Data Products rund um bestehende ERP-, MES-, LIMS-, EWM-, Historian-, CMO- und andere IT/OT-Plattformen.',
    cta: 'Architektur ansehen',
    concepts: {
      'standard-core': {
        title: 'STANDARDISIERTER KERN',
        body: 'Bestehende operative Plattformen bleiben stabil und nah am Standard.',
      },
      'governed-integration': {
        title: 'GESTEUERTE INTEGRATION',
        body: 'APIs, Events, MQTT, REST und Streams liefern kontrollierte Schnittstellen zu Betriebsdaten.',
      },
      'independent-data-products': {
        title: 'UNABHÄNGIGE DATA PRODUCTS',
        body: 'Data Products entwickeln sich unabhängig mit Contracts, Quality Gates, Compatibility, CI/CD, Catalog und Governance.',
      },
    },
  },
  principle: {
    eyebrow: 'So fügt es sich zusammen',
    title: 'Von stabilen Kernsystemen zu gesteuerten Data Products.',
    body1:
      'Halten Sie ERP, MES, LIMS, EWM, CMO-Plattformen und andere IT/OT-Systeme stabil und nah am Standard.',
    body2:
      'Pharma Data Factory ergänzt eine gesteuerte digitale Schicht um diese Systeme: Assets werden semantisch beschrieben, Betriebsdaten fließen über gesteuerte Schnittstellen, wiederverwendbare Komponenten liefern technische Fähigkeiten, und Golden Paths machen daraus unabhängig evolvierende Data Products.',
    finale: 'Kernsysteme standardisiert halten.\nDigitale Fähigkeiten kombinieren.\nGesteuerte Data Products liefern.',
    benefits: [
      'Weniger unnötige Kernanpassungen',
      'Digitale Innovation vom Core-Release-Zyklus entkoppeln',
      'Schnellerer Nutzen',
      'Gesteuerte Data Products',
      'Unabhängige Versionierung',
      'Wiederverwendbare Fähigkeiten',
    ],
    certified: 'Zertifiziert',
    illustrative: 'Beispielhaft',
    vizLabel: 'Kernsysteme standardisiert halten und über Data Products innovieren',
    layerStandard: 'Standard-Systeme',
    layerStable: 'Standardisiertes, stabiles IT/OT-Kernsystem',
    layerInterfaces: 'Gesteuerte Schnittstellen',
    layerProducts: 'Data Products',
    sectionLabel: 'Architekturprinzip',
    benefitsLabel: 'Architekturnutzen',
    srOnly:
      'Systeme of Record bleiben ERP, MES, LIMS, EWM, Historian, CMO-Plattformen, PLC, SCADA und andere IT/OT. AAS erklärt, was ein Asset ist und was seine Daten bedeuten. Unified Namespace steuert, wo Betriebsdaten fließen. Zertifizierte Platform Components liefern wiederverwendbare Fähigkeiten. Golden Paths kombinieren sie zu unabhängig evolvierenden Data Products. Pharma Data Factory ist die Control Plane. Sie ersetzt keine Quellsysteme, speichert keine Zeitreihen in AAS und verarbeitet nicht alle Betriebsdaten.',
    mapsTo: 'entspricht',
    dataProductKind: 'Data Product',
    layers: {
      standard: 'Standard-Systeme',
      aas: 'Asset Administration / AAS',
      uns: 'Unified Namespace',
      components: 'Platform Components',
      goldenPaths: 'Golden Paths',
      products: 'Data Products',
      factory: 'Pharma Data Factory',
    },
    captions: {
      stableCore: 'Standardisiertes, stabiles IT/OT-Kernsystem',
      systemsOfRecord: 'Systems of Record bleiben stabil und nah am Standard.',
      aas: 'AAS erklärt, was ein Asset ist und was seine Daten bedeuten. AAS speichert keine Zeitreihenwerte.',
      uns: 'UNS steuert, wo und wie Betriebsdaten fließen. AAS = Bedeutung. UNS = Datenfluss.',
      goldenCompose: 'Golden Paths kombinieren zertifizierte Fähigkeiten',
      goldenExamples:
        'Offizielle Beispiele heute: MQTT Temperature, REST Equipment und OEE Data Product. Cold Chain, Quality, Energy und AI Assistant sind Zukunft.',
      dataProduct:
        'Ein Data Product enthält Geschäftswert und kann unabhängig vom operativen Kern evolvieren.',
      controlPlane:
        'Die Control Plane steuert, wie Data Products gebaut, freigegeben, gefunden und betrieben werden. Sie verarbeitet nicht alle Betriebsdaten.',
    },
  },
  storyCta: {
    primary: 'Plattformarchitektur erkunden',
    secondary: 'Golden Paths erkunden',
  },
  platform: {
    eyebrow: 'Plattformnutzen',
    title: 'Sechs Fähigkeiten für gesteuerte Data Products',
    sub: 'Eine kohärente kommerzielle Control Plane — kein Standard-Backstage-Portal.',
    groupTitle: 'Kernfunktionen',
    kind: 'Plattformfähigkeit',
    badge: 'Kernfunktion',
    explore: 'Ansehen',
    capabilities: {
      connect: {
        title: 'VERBINDEN',
        text: 'Operative und unternehmensweite Datenquellen anbinden.',
      },
      create: {
        title: 'ERSTELLEN',
        text: 'Standardisierte Data Products über zertifizierte Golden Paths erzeugen.',
      },
      trust: {
        title: 'VERTRAUEN',
        text: 'Versionierte Contracts, Quality Gates und Compatibility Checks.',
      },
      govern: {
        title: 'STEUERN',
        text: 'Ownership, RBAC, technische Zertifizierung und Lifecycle-Governance.',
      },
      discover: {
        title: 'FINDEN',
        text: 'Katalog, Search, TechDocs und Marketplace.',
      },
      operate: {
        title: 'BETREIBEN',
        text: 'CI/CD, Versionierung, Compliance-Status und Upgrade Management.',
      },
    },
  },
  howItWorks: {
    eyebrow: 'So funktioniert es',
    title: 'Von den Quellsystemen bis zum Verbrauch',
    sub: 'Ein industrieller Pfad. Ein kurzer Satz je Stufe.',
    journey: 'Product-Pfad',
    steps: ['Verbinden', 'Verstehen', 'Kombinieren', 'Bauen', 'Steuern', 'Nutzen'],
    sentences: [
      'REST, MQTT und IT/OT bleiben am Rand.',
      'Assets und Bedeutung bleiben gesteuert.',
      'Wiederverwendbare Fähigkeiten werden einmal zertifiziert.',
      'Golden Paths erzeugen das Data Product.',
      'Qualität, Compatibility und CI/CD sind Standard.',
      'APIs und Anwendungen binden sich an den Contract.',
    ],
  },
  goldenPaths: {
    eyebrow: 'Golden Path Showcase',
    title: 'Zertifizierte Golden Paths für die Fertigung',
    sub: 'CERTIFIED bedeutet nur technische Plattformzertifizierung. Das ist keine GxP- oder regulatorische Validierung.',
    certifiedGroup: 'Zertifizierte Templates',
    plannedTitle: 'Geplante / zukünftige Golden Paths',
    plannedSub:
      'Diese Beispiele sind nicht implementiert und im aktuellen MVP nicht verfügbar.',
    kindCertified: 'Golden-Path-Template',
    kindPlanned: 'Geplantes Template',
    explore: 'Ansehen',
    unavailable: 'Nicht verfügbar',
    items: {
      'mqtt-temperature': {
        description:
          'MQTT-Temperatur-Telemetrie aufnehmen, eine gesteuerte Zeitreihe speichern und einen REST-Contract mit Health, Tests, Docker und Katalogmetadaten bereitstellen.',
      },
      'rest-equipment': {
        description:
          'Equipment-Zustand per REST abfragen und als gesteuertes Equipment Data Product mit Contract, Tests, CI und Dokumentation veröffentlichen.',
      },
      oee: {
        description:
          'MES-Produktionskontext und Maschinen-MQTT zu Availability, Performance, Quality und OEE zusammensetzen. Mode A. Nur technische Zertifizierung, keine GxP.',
      },
      snowflake: {
        description:
          'Geplantes Warehouse-Connector-Golden-Path. In diesem Release nicht implementiert. Keine echte Snowflake-Anbindung.',
      },
      sap: {
        description:
          'Geplantes SAP-Connectivity-Golden-Path. In diesem Release nicht implementiert. Keine echte SAP-Anbindung.',
      },
      'cold-chain': {
        description:
          'Geplantes Cold-Chain-Monitoring-Golden-Path. Nicht implementiert und im aktuellen MVP nicht verfügbar.',
      },
    },
  },
  finalCta: {
    title: 'Die Factory sehen',
    sub: 'Vereinbaren Sie eine Demo oder melden Sie sich an der Control Plane an.',
  },
};

export const landingCopy: Record<LandingLocaleId, LandingCopy> = { en, de };

function isLocale(value: string | null): value is LandingLocaleId {
  return value === 'en' || value === 'de';
}

export function readStoredLandingLocale(): LandingLocaleId {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const stored = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // ignore storage failures
  }
  return 'en';
}

interface LandingI18nValue {
  locale: LandingLocaleId;
  setLocale: (locale: LandingLocaleId) => void;
  t: LandingCopy;
}

const LandingI18nContext = createContext<LandingI18nValue | null>(null);

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocaleId>(readStoredLandingLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore storage failures
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: landingCopy[locale],
    }),
    [locale],
  );

  return (
    <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>
  );
}

export function useLandingI18n(): LandingI18nValue {
  const context = useContext(LandingI18nContext);
  if (!context) {
    return {
      locale: 'en',
      setLocale: () => undefined,
      t: landingCopy.en,
    };
  }
  return context;
}
