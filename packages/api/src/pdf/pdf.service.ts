import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, Page } from 'puppeteer';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize Puppeteer browser connection
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    const chromeWsEndpoint =
      this.configService.get<string>('CHROME_WS_ENDPOINT');

    try {
      if (chromeWsEndpoint) {
        // Connect to remote Chrome instance (e.g., Browserless)
        this.logger.log(`Connecting to Chrome at ${chromeWsEndpoint}`);
        this.browser = await puppeteer.connect({
          browserWSEndpoint: chromeWsEndpoint,
        });
      } else {
        // Launch local Chrome instance
        this.logger.log('Launching local Chrome instance');
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }

      this.logger.log('Browser connected successfully');
      return this.browser;
    } catch (error) {
      this.logger.error(`Failed to connect to browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate PDF from HTML string
   * @param html HTML content to convert to PDF
   * @param options PDF generation options
   * @returns PDF as Buffer
   */
  async generatePdfFromHtml(
    html: string,
    options?: {
      format?: 'A4' | 'Letter';
      printBackground?: boolean;
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
    },
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    let page: Page | null = null;

    try {
      page = await browser.newPage();

      // Set content with proper encoding
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options?.format || 'A4',
        printBackground: options?.printBackground ?? true,
        margin: options?.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      this.logger.log('PDF generated successfully');
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Clean up browser connection
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.disconnect();
      this.logger.log('Browser disconnected');
    }
  }
}
