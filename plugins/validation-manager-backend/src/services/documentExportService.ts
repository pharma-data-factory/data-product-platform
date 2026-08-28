/**
 * Document Export Service
 * Exports approved documents to external folder with versioning
 * Filename pattern: {DocumentType}-v{version}-{date}-APPROVED.pdf
 * 
 * Example:
 *   /archive/approved-documents/URS-v1.0.0-2026-08-25-APPROVED.pdf
 *   /archive/approved-documents/TDS-v1.0.0-2026-08-25-APPROVED.pdf
 *   /archive/approved-documents/TRACEABILITY-v1.0.0-2026-08-25-APPROVED.pdf
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import { Requirement } from './complianceService';
import { ExportedDocument, DocumentExportConfig } from '../models/admin';

export interface ExportOptions {
  documentType: 'URS' | 'TDS' | 'TRACEABILITY';
  markdownContent: string;
  overwrite?: boolean;
  createBackup?: boolean;
}

export interface ExportResult {
  success: boolean;
  exportedDocument?: ExportedDocument;
  filepath?: string;
  filesize?: number;
  hash?: string;
  error?: string;
  warnings?: string[];
}

export class DocumentExportService {
  private config: DocumentExportConfig;

  constructor(config: DocumentExportConfig) {
    this.config = config;
    this.ensureExportFolderExists();
  }

  /**
   * Ensure export folder exists, create if needed
   */
  private ensureExportFolderExists(): void {
    if (!fs.existsSync(this.config.exportFolder)) {
      try {
        fs.mkdirSync(this.config.exportFolder, { recursive: true });
      } catch (err) {
        console.error(`Failed to create export folder: ${this.config.exportFolder}`, err);
      }
    }
  }

  /**
   * Generate filename following GMP naming convention
   * Pattern: {DocumentType}-v{version}-{date}-APPROVED.{extension}
   */
  private generateFilename(
    requirement: Requirement,
    documentType: 'URS' | 'TDS' | 'TRACEABILITY',
    extension: 'pdf' | 'md' = 'pdf'
  ): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const version = requirement.version;
    return `${documentType}-v${version}-${date}-APPROVED.${extension}`;
  }

  /**
   * Export requirement as markdown
   */
  async exportAsMarkdown(
    requirement: Requirement,
    markdownContent: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const filename = this.generateFilename(requirement, options.documentType, 'md');
      const filepath = path.join(this.config.exportFolder, filename);

      // Check if file exists
      if (fs.existsSync(filepath) && !options.overwrite) {
        return {
          success: false,
          error: `File already exists: ${filename}. Set overwrite=true to replace.`,
        };
      }

      // Create backup if requested
      if (options.createBackup && fs.existsSync(filepath)) {
        const backupFilename = `${filename}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const backupPath = path.join(this.config.exportFolder, backupFilename);
        fs.copyFileSync(filepath, backupPath);
      }

      // Write file
      fs.writeFileSync(filepath, markdownContent, 'utf-8');

      // Calculate hash
      const hash = this.calculateHash(markdownContent);

      // Get file info
      const stats = fs.statSync(filepath);

      // Create export metadata
      const exportedDocument: ExportedDocument = {
        id: uuid(),
        requirementId: requirement.id,
        documentType: options.documentType,
        version: requirement.version,
        filename,
        filepath,
        filesize: stats.size,
        exportDate: new Date().toISOString(),
        exportedBy: 'SYSTEM', // In real app: authenticated user
        hash,
        approvalState: 'APPROVED',
        compressionMethod: 'NONE',
        encryptionEnabled: false,
      };

      return {
        success: true,
        exportedDocument,
        filepath,
        filesize: stats.size,
        hash,
      };
    } catch (err) {
      return {
        success: false,
        error: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export requirement as PDF (would use pdf-lib or puppeteer)
   * For now: placeholder that exports markdown
   */
  async exportAsPDF(
    requirement: Requirement,
    markdownContent: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    // In real implementation: use pdf-lib or puppeteer to convert markdown to PDF
    // For MVP: export as markdown and note it should be converted to PDF
    
    try {
      const filename = this.generateFilename(requirement, options.documentType, 'pdf');
      const filepath = path.join(this.config.exportFolder, filename);

      // TODO: Convert markdown to PDF using pdf-lib or puppeteer
      // For now, write markdown content as PDF placeholder
      const pdfContent = this.markdownToPdfPlaceholder(markdownContent, requirement, options.documentType);

      // Write file
      fs.writeFileSync(filepath, pdfContent, 'utf-8');

      const stats = fs.statSync(filepath);
      const hash = this.calculateHash(pdfContent);

      const exportedDocument: ExportedDocument = {
        id: uuid(),
        requirementId: requirement.id,
        documentType: options.documentType,
        version: requirement.version,
        filename,
        filepath,
        filesize: stats.size,
        exportDate: new Date().toISOString(),
        exportedBy: 'SYSTEM',
        hash,
        approvalState: 'APPROVED',
        compressionMethod: 'NONE',
        encryptionEnabled: false,
      };

      return {
        success: true,
        exportedDocument,
        filepath,
        filesize: stats.size,
        hash,
        warnings: ['PDF generation requires additional setup (pdf-lib or puppeteer)'],
      };
    } catch (err) {
      return {
        success: false,
        error: `PDF export failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Placeholder for markdown to PDF conversion
   */
  private markdownToPdfPlaceholder(
    content: string,
    requirement: Requirement,
    documentType: string
  ): string {
    return `%PDF-1.4
%GMP-APPROVED-DOCUMENT
% Document: ${documentType}
% Requirement: ${requirement.id}
% Version: ${requirement.version}
% Date: ${new Date().toISOString()}
% Status: APPROVED
%
% NOTE: This is a placeholder. Implement with:
% - pdf-lib (library for creating PDFs)
% - puppeteer (headless Chrome for rendering)
% - pdfkit (PDF generator for Node.js)
%
%Content:
${content}
%EOF`;
  }

  /**
   * Export multiple requirements as batch
   */
  async exportBatch(
    requirements: Requirement[],
    documentTypes: Array<'URS' | 'TDS' | 'TRACEABILITY'>,
    markdownGenerator: (req: Requirement, docType: string) => string
  ): Promise<{
    success: boolean;
    totalRequirements: number;
    exportedCount: number;
    results: ExportResult[];
  }> {
    const results: ExportResult[] = [];

    for (const requirement of requirements) {
      for (const docType of documentTypes) {
        try {
          const markdownContent = markdownGenerator(requirement, docType);
          const result = await this.exportAsMarkdown(requirement, markdownContent, {
            documentType: docType,
            markdownContent,
          });
          results.push(result);
        } catch (err) {
          results.push({
            success: false,
            error: `Failed to export ${docType} for ${requirement.id}`,
          });
        }
      }
    }

    const exportedCount = results.filter(r => r.success).length;

    return {
      success: exportedCount === results.length,
      totalRequirements: requirements.length,
      exportedCount,
      results,
    };
  }

  /**
   * List all exported documents
   */
  listExportedDocuments(): ExportedDocument[] {
    try {
      const files = fs.readdirSync(this.config.exportFolder);
      return files
        .filter(f => f.includes('APPROVED'))
        .map(f => ({
          id: uuid(),
          requirementId: this.extractRequirementId(f),
          documentType: this.extractDocumentType(f) as 'URS' | 'TDS' | 'TRACEABILITY',
          version: this.extractVersion(f),
          filename: f,
          filepath: path.join(this.config.exportFolder, f),
          filesize: fs.statSync(path.join(this.config.exportFolder, f)).size,
          exportDate: this.extractDate(f),
          exportedBy: 'SYSTEM',
          hash: '',
          approvalState: 'APPROVED',
          compressionMethod: 'NONE',
          encryptionEnabled: false,
        }));
    } catch (err) {
      console.error('Failed to list exported documents:', err);
      return [];
    }
  }

  /**
   * Delete exported document
   */
  deleteExportedDocument(filename: string): {
    success: boolean;
    error?: string;
  } {
    try {
      const filepath = path.join(this.config.exportFolder, filename);

      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'File not found' };
      }

      fs.unlinkSync(filepath);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Verify document integrity
   */
  verifyDocumentIntegrity(filename: string, expectedHash: string): {
    isValid: boolean;
    calculatedHash: string;
    expectedHash: string;
  } {
    try {
      const filepath = path.join(this.config.exportFolder, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const calculatedHash = this.calculateHash(content);

      return {
        isValid: calculatedHash === expectedHash,
        calculatedHash,
        expectedHash,
      };
    } catch (err) {
      return {
        isValid: false,
        calculatedHash: '',
        expectedHash,
      };
    }
  }

  /**
   * Calculate SHA256 hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract requirement ID from filename
   * Filename: {DocumentType}-v{version}-{date}-APPROVED.{ext}
   * Example: URS-v1.0.0-2026-08-25-APPROVED.pdf → URS
   */
  private extractRequirementId(filename: string): string {
    const parts = filename.split('-');
    return parts[0] || 'UNKNOWN';
  }

  /**
   * Extract document type from filename
   */
  private extractDocumentType(filename: string): string {
    const parts = filename.split('-');
    return parts[0] || 'UNKNOWN';
  }

  /**
   * Extract version from filename
   */
  private extractVersion(filename: string): string {
    const match = filename.match(/v(\d+\.\d+\.\d+)/);
    return match ? match[1] : '0.0.0';
  }

  /**
   * Extract date from filename
   */
  private extractDate(filename: string): string {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : new Date().toISOString().split('T')[0];
  }

  /**
   * Get export statistics
   */
  getExportStats(): {
    totalDocuments: number;
    totalSize: number;
    documentsByType: Record<string, number>;
    oldestDocument: string | null;
    newestDocument: string | null;
  } {
    try {
      const files = fs.readdirSync(this.config.exportFolder);
      const approvedFiles = files.filter(f => f.includes('APPROVED'));

      let totalSize = 0;
      const documentsByType: Record<string, number> = {};
      let oldestDate = new Date();
      let newestDate = new Date(0);
      let oldestFile = null;
      let newestFile = null;

      approvedFiles.forEach(f => {
        const docType = this.extractDocumentType(f);
        documentsByType[docType] = (documentsByType[docType] || 0) + 1;

        const filepath = path.join(this.config.exportFolder, f);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;

        const fileDate = new Date(this.extractDate(f));
        if (fileDate < oldestDate) {
          oldestDate = fileDate;
          oldestFile = f;
        }
        if (fileDate > newestDate) {
          newestDate = fileDate;
          newestFile = f;
        }
      });

      return {
        totalDocuments: approvedFiles.length,
        totalSize,
        documentsByType,
        oldestDocument: oldestFile,
        newestDocument: newestFile,
      };
    } catch (err) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        documentsByType: {},
        oldestDocument: null,
        newestDocument: null,
      };
    }
  }
}

/**
 * Factory function to create export service with default config
 */
export function createDocumentExportService(
  exportFolder: string = '/archive/approved-documents'
): DocumentExportService {
  const config: DocumentExportConfig = {
    enabled: true,
    exportFolder,
    filenamingPattern: '{DocumentType}-v{version}-{date}-APPROVED',
    includeMetadata: true,
    includeAuditTrail: false,
    includeApprovalChain: true,
    compression: 'NONE',
    encryption: {
      enabled: false,
      algorithm: 'AES-256',
    },
  };

  return new DocumentExportService(config);
}

export const documentExportService = createDocumentExportService();
