/**
 * Document Generation Service
 * Auto-generates URS.md, TDS.md, Traceability Matrix with proper versioning
 * GMP-compliant document headers and footers
 */

import { Requirement } from './complianceService';

export interface DocumentHeader {
  documentId: string;
  documentTitle: string;
  version: string;
  date: string;
  status: 'DRAFT' | 'APPROVED' | 'SIGNED';
  author: string;
  approvers: string[];
  retentionPeriod: string;
}

export class DocumentService {
  /**
   * Generate URS Document with GMP Header
   */
  generateURS(requirements: Requirement[]): { markdown: string; header: DocumentHeader } {
    const header: DocumentHeader = {
      documentId: `DOC-${new Date().getFullYear()}-URS-001`,
      documentTitle: 'User Requirements Specification — Platform Core',
      version: this.getDocumentVersion(requirements),
      date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      author: 'Validation Team',
      approvers: [],
      retentionPeriod: '3 years (active) + 7 years (archive)',
    };

    let markdown = this.generateGMPHeader(header);

    markdown += `\n## Requirements Summary\n\n`;
    markdown += `| Metric | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Requirements | ${requirements.length} |\n`;
    markdown += `| GxP Direct | ${requirements.filter(r => r.gxpRelevance === 'Direct').length} |\n`;
    markdown += `| GxP Indirect | ${requirements.filter(r => r.gxpRelevance === 'Indirect').length} |\n`;
    markdown += `| High Risk | ${requirements.filter(r => r.riskLevel === 'High').length} |\n`;
    markdown += `| Baselined | ${requirements.filter(r => r.requirementState === 'BASELINED').length} |\n\n`;

    // Grouped by category
    const categories = new Map<string, Requirement[]>();
    requirements.forEach(req => {
      const cat = req.id.split('-')[0]; // URS, SYS, etc.
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(req);
    });

    categories.forEach((reqs, category) => {
      markdown += this.generateRequirementSection(category, reqs);
    });

    markdown += this.generateGMPFooter(header);

    return { markdown, header };
  }

  /**
   * Generate Technical Design Specification
   */
  generateTDS(requirements: Requirement[]): { markdown: string; header: DocumentHeader } {
    const header: DocumentHeader = {
      documentId: `DOC-${new Date().getFullYear()}-TDS-001`,
      documentTitle: 'Technical Design Specification — Platform Core',
      version: this.getDocumentVersion(requirements),
      date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      author: 'Engineering Team',
      approvers: [],
      retentionPeriod: '3 years (active) + 7 years (archive)',
    };

    let markdown = this.generateGMPHeader(header);

    markdown += `\n## Design Overview\n\n`;
    markdown += `This document describes the technical design for all baselined requirements.\n\n`;

    markdown += `## Mapped Requirements\n\n`;
    requirements.forEach(req => {
      markdown += `### ${req.id} → TDS-${req.id}\n\n`;
      markdown += `| Field | Value |\n`;
      markdown += `|-------|-------|\n`;
      markdown += `| Requirement | ${req.title} |\n`;
      markdown += `| GxP Relevance | ${req.gxpRelevance} |\n`;
      markdown += `| Risk Level | ${req.riskLevel} |\n\n`;
    });

    markdown += this.generateGMPFooter(header);

    return { markdown, header };
  }

  /**
   * Generate Traceability Matrix
   * URS → SYS → TDS → Tests
   */
  generateTraceabilityMatrix(requirements: Requirement[]): { markdown: string; header: DocumentHeader } {
    const header: DocumentHeader = {
      documentId: `DOC-${new Date().getFullYear()}-TRACEABILITY-001`,
      documentTitle: 'Traceability Matrix — Platform Core',
      version: this.getDocumentVersion(requirements),
      date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      author: 'QA Team',
      approvers: [],
      retentionPeriod: '3 years (active) + 7 years (archive)',
    };

    let markdown = this.generateGMPHeader(header);

    markdown += `\n## Forward Traceability (URS → Tests)\n\n`;
    markdown += `| URS | SYS | TDS | Risk | Tests | Status |\n`;
    markdown += `|-----|-----|-----|------|-------|--------|\n`;

    requirements.forEach(req => {
      markdown += `| ${req.id} `;
      markdown += `| SYS-${req.id.replace('URS-', '')} `;
      markdown += `| TDS-${req.id.replace('URS-', '')} `;
      markdown += `| ${req.riskLevel} `;
      markdown += `| TEST-* `;
      markdown += `| ${req.verificationStatus} |\n`;
    });

    markdown += this.generateGMPFooter(header);

    return { markdown, header };
  }

  /**
   * Generate GMP-Compliant Document Header
   */
  private generateGMPHeader(header: DocumentHeader): string {
    return `# ${header.documentTitle}

**Document ID:** ${header.documentId}  
**Version:** ${header.version}  
**Status:** ${header.status}  
**Generated:** ${header.date}  
**Author:** ${header.author}  
**Retention:** ${header.retentionPeriod}  

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | ${header.documentId} |
| Title | ${header.documentTitle} |
| Version | ${header.version} |
| Date | ${header.date} |
| Status | ${header.status} |
| Author | ${header.author} |
| Approvers | ${header.approvers.join(', ') || 'Pending'} |
| Retention Period | ${header.retentionPeriod} |

**IMPORTANT:** This is a GMP-controlled document. Any changes require change control and re-approval.

---
`;
  }

  /**
   * Generate GMP-Compliant Document Footer with Signature Block
   */
  private generateGMPFooter(header: DocumentHeader): string {
    return `

---

## Approval and Signature

### Approval Chain

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | __________ | __________ | __________ |
| Validation Lead | __________ | __________ | __________ |
| Legal/Compliance | __________ | __________ | __________ |
| Document Owner | __________ | __________ | __________ |

### Document Integrity

**Hash (SHA256):** \`[auto-calculated]\`  
**Timestamp Authority:** https://tsa.example.com  
**Valid Until:** [auto-calculated from signature date]

---

## Revision History

| Version | Date | Change Description | Author | Change Type |
|---------|------|-------------------|--------|-------------|
| 1.0.0 | [date] | Initial baseline | [author] | MAJOR |
| 1.0.1 | [date] | [description] | [author] | MINOR |

---

## Notes

- This document is controlled under GMP regulations
- All changes require Change Control Form (CC-XXX) for MAJOR changes
- MINOR changes require QA approval
- Once signed, this document becomes immutable
- Archive retention: 7 years from signature date
- Access is restricted to authorized personnel only

---

**DOCUMENT CONTROLLED - DO NOT DISTRIBUTE**
`;
  }

  /**
   * Generate individual requirement section
   */
  private generateRequirementSection(category: string, requirements: Requirement[]): string {
    let markdown = `\n## ${category} Requirements\n\n`;

    requirements.forEach(req => {
      markdown += `### ${req.id}\n\n`;
      markdown += `| Field | Value |\n`;
      markdown += `|-------|-------|\n`;
      markdown += `| ID | ${req.id} |\n`;
      markdown += `| Title | ${req.title} |\n`;
      markdown += `| Description | ${req.description} |\n`;
      markdown += `| Rationale | ${req.rationale} |\n`;
      markdown += `| GxP Relevance | **${req.gxpRelevance}** |\n`;
      markdown += `| Risk Level | **${req.riskLevel}** |\n`;
      markdown += `| State | ${req.requirementState} |\n`;
      markdown += `| Implementation | ${req.implementationStatus} |\n`;
      markdown += `| Verification | ${req.verificationStatus} |\n`;
      markdown += `| Version | ${req.version} |\n\n`;
    });

    return markdown;
  }

  /**
   * Calculate document version from requirement versions
   */
  private getDocumentVersion(requirements: Requirement[]): string {
    if (requirements.length === 0) return '1.0.0';

    // Get the highest major version from all requirements
    const versions = requirements
      .map(r => r.version.split('.').map(Number))
      .sort((a, b) => {
        if (a[0] !== b[0]) return b[0] - a[0];
        if (a[1] !== b[1]) return b[1] - a[1];
        return b[2] - a[2];
      });

    if (versions.length === 0) return '1.0.0';
    return `${versions[0][0]}.${versions[0][1]}.${versions[0][2]}`;
  }

  /**
   * Export as PDF (would integrate with pdf-lib or similar)
   */
  async generatePDF(markdownContent: string, filename: string): Promise<Buffer> {
    // This would use a library like pdf-lib or puppeteer to generate PDF
    // For now, return placeholder
    console.log(`Generating PDF: ${filename}`);
    return Buffer.from('PDF content placeholder');
  }

  /**
   * Generate with timestamp for archive
   */
  getArchiveFilename(documentType: string, version: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${documentType}-v${version}-${timestamp}.pdf`;
  }
}

export const documentService = new DocumentService();
