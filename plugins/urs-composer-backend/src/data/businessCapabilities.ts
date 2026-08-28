/**
 * Business Capabilities Seed Data
 *
 * Derived from: docs/capability-matrix.md
 * These are reference-only and should match the canonical capability-matrix.md
 *
 * This is a minimal P0 seed. Future versions can load from YAML or Catalog.
 */

import { BusinessCapability } from '../types';

export const BUSINESS_CAPABILITIES: BusinessCapability[] = [
  {
    id: 'business-capability:make/equipment-performance-management',
    name: 'Equipment Performance Management',
    description:
      'Operations must be able to understand equipment effectiveness and its major losses.',
    domain: 'make',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/equipment-usage-management',
    name: 'Equipment Usage Management',
    description:
      'Operations must be able to determine when equipment was used and for which manufacturing context.',
    domain: 'make',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/material-dispensing',
    name: 'Material Dispensing',
    description:
      'Operators must be able to dispense the correct material and quantity for the applicable manufacturing operation.',
    domain: 'make',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/environmental-monitoring',
    name: 'Environmental Monitoring',
    description:
      'Monitor environmental conditions (temperature, humidity, pressure) in manufacturing areas.',
    domain: 'make',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:make/batch-traceability',
    name: 'Batch Traceability',
    description:
      'Maintain complete traceability of material batches through manufacturing.',
    domain: 'make',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:quality/compliance-documentation',
    name: 'Compliance Documentation',
    description:
      'Generate and maintain compliance documentation for regulatory requirements.',
    domain: 'quality',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:quality/change-management',
    name: 'Change Management',
    description:
      'Control and document changes to manufacturing processes and systems.',
    domain: 'quality',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:supply/material-inventory',
    name: 'Material Inventory Management',
    description:
      'Track and manage material inventory across manufacturing sites.',
    domain: 'supply',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:supply/supplier-quality',
    name: 'Supplier Quality Management',
    description:
      'Monitor and assess quality of materials from suppliers.',
    domain: 'supply',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
  {
    id: 'business-capability:analytics/production-analytics',
    name: 'Production Analytics',
    description:
      'Analyze production data to identify trends, bottlenecks, and optimization opportunities.',
    domain: 'analytics',
    source: 'DOCUMENTATION',
    documentationRef: 'docs/capability-matrix.md',
  },
];
