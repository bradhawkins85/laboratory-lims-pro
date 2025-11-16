/**
 * COA PDF Generation Module
 * Puppeteer wrapper to render HTML → PDF buffer; upload to S3; return key
 */

import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from '../../pdf/pdf.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class COAPdfService {
  private readonly logger = new Logger(COAPdfService.name);

  constructor(
    private pdfService: PdfService,
    private storageService: StorageService,
  ) {}

  /**
   * Generate PDF from HTML and upload to storage
   * @param html HTML content to convert to PDF
   * @param fileName File name for the PDF
   * @param options PDF generation options
   * @returns Storage key for the uploaded PDF
   */
  async generateAndUploadPdf(
    html: string,
    fileName: string,
    options?: {
      format?: 'A4' | 'Letter';
      printBackground?: boolean;
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
    },
  ): Promise<string> {
    try {
      this.logger.log(`Generating PDF: ${fileName}`);

      // Generate PDF buffer using Puppeteer
      const pdfBuffer = await this.pdfService.generatePdfFromHtml(
        html,
        options,
      );

      this.logger.log(
        `PDF generated successfully, size: ${pdfBuffer.length} bytes`,
      );

      // Upload to S3/MinIO storage
      const key = await this.storageService.uploadFile(
        fileName,
        pdfBuffer,
        'application/pdf',
      );

      this.logger.log(`PDF uploaded successfully: ${key}`);

      return key;
    } catch (error) {
      this.logger.error(
        `Failed to generate and upload PDF: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate PDF from HTML without uploading
   * @param html HTML content to convert to PDF
   * @param options PDF generation options
   * @returns PDF buffer
   */
  async generatePdf(
    html: string,
    options?: {
      format?: 'A4' | 'Letter';
      printBackground?: boolean;
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
    },
  ): Promise<Buffer> {
    return this.pdfService.generatePdfFromHtml(html, options);
  }
}
