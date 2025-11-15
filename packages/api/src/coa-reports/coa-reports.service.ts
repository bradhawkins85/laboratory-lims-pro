import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { PdfService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { LabSettingsService } from '../lab-settings/lab-settings.service';
import { COAReport, COAReportStatus } from '@prisma/client';

export interface BuildCOADto {
  sampleId: string;
  notes?: string;
  includeFields?: string[]; // Optional: specify which fields to include
}

export interface COATemplateSettings {
  visibleFields?: string[];
  labelOverrides?: Record<string, string>;
  columnOrder?: string[];
}

export interface COADataSnapshot {
  sample: {
    jobNumber: string;
    dateReceived: Date;
    dateDue?: Date;
    releaseDate?: Date;
    client: {
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    sampleCode: string;
    rmSupplier?: string;
    sampleDescription?: string;
    uinCode?: string;
    sampleBatch?: string;
    temperatureOnReceiptC?: number;
    storageConditions?: string;
    comments?: string;
    needByDate?: Date;
    mcdDate?: Date;
    statusFlags: {
      expiredRawMaterial: boolean;
      postIrradiatedRawMaterial: boolean;
      stabilityStudy: boolean;
      urgent: boolean;
      allMicroTestsAssigned: boolean;
      allChemistryTestsAssigned: boolean;
      released: boolean;
      retest: boolean;
    };
  };
  tests: Array<{
    section: { name: string };
    method: { code: string; name: string; unit?: string };
    specification?: {
      code: string;
      name: string;
      target?: string;
      min?: number;
      max?: number;
      unit?: string;
    };
    testName: string;
    dueDate?: Date;
    analyst?: { name?: string; email: string };
    status: string;
    testDate?: Date;
    result?: string;
    resultUnit?: string;
    checker?: { name?: string; email: string };
    chkDate?: Date;
    oos: boolean;
    comments?: string;
    invoiceNote?: string;
    precision?: string;
    linearity?: string;
  }>;
  reportMetadata: {
    version: number;
    generatedAt: Date;
    generatedBy: string;
    labName?: string;
    labLogoUrl?: string;
    disclaimerText?: string;
    templateSettings?: COATemplateSettings;
  };
}

@Injectable()
export class COAReportsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private pdfService: PdfService,
    private storageService: StorageService,
    private configService: ConfigService,
    private labSettingsService: LabSettingsService,
  ) {}

  /**
   * Build/Preview COA (creates DRAFT version)
   * AC: PDF generation uses htmlSnapshot + dataSnapshot captured at build time
   */
  async buildCOA(dto: BuildCOADto, context: AuditContext): Promise<COAReport> {
    // Get sample with all related data
    const sample = await this.prisma.sample.findUnique({
      where: { id: dto.sampleId },
      include: {
        job: true,
        client: true,
        testAssignments: {
          include: {
            section: true,
            method: true,
            specification: true,
            testDefinition: true,
            analyst: { select: { id: true, email: true, name: true } },
            checker: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with ID '${dto.sampleId}' not found`);
    }

    // Get the next version number for this sample
    const latestReport = await this.prisma.cOAReport.findFirst({
      where: { sampleId: dto.sampleId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = latestReport ? latestReport.version + 1 : 1;

    // Build data snapshot
    const dataSnapshot = await this.buildDataSnapshot(
      sample,
      nextVersion,
      context,
    );

    // Build HTML snapshot
    const htmlSnapshot = this.buildHTMLSnapshot(dataSnapshot);

    // Create the COA report
    const coaReport = await this.prisma.cOAReport.create({
      data: {
        sampleId: dto.sampleId,
        version: nextVersion,
        status: COAReportStatus.DRAFT,
        dataSnapshot: dataSnapshot as any,
        htmlSnapshot,
        notes: dto.notes,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry
    await this.auditService.logCreate(
      context,
      'COAReport',
      coaReport.id,
      coaReport,
    );

    return coaReport;
  }

  /**
   * Finalize COA (marks as FINAL, generates PDF, stores it, marks previous versions as SUPERSEDED)
   * AC: Each finalization generates PDF and marks previous FINAL as SUPERSEDED
   */
  async finalizeCOA(id: string, context: AuditContext): Promise<COAReport> {
    const oldReport = await this.prisma.cOAReport.findUnique({
      where: { id },
      include: { sample: true },
    });

    if (!oldReport) {
      throw new NotFoundException(`COAReport with ID '${id}' not found`);
    }

    if (oldReport.status !== COAReportStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT reports can be finalized');
    }

    // Generate PDF if not already present
    let pdfKey = oldReport.pdfKey;
    if (!pdfKey && oldReport.htmlSnapshot) {
      const pdfBuffer = await this.pdfService.generatePdfFromHtml(
        oldReport.htmlSnapshot,
      );

      const pdfStoragePath = this.configService.get<string>(
        'PDF_STORAGE_PATH',
        'coa-reports',
      );
      const sampleCode =
        (oldReport.sample as any)?.sampleCode || oldReport.sampleId;
      pdfKey = `${pdfStoragePath}/${sampleCode}-v${oldReport.version}-${Date.now()}.pdf`;

      await this.storageService.uploadFile(
        pdfKey,
        pdfBuffer,
        'application/pdf',
      );
    }

    // Mark all previous FINAL reports for this sample as SUPERSEDED
    await this.prisma.cOAReport.updateMany({
      where: {
        sampleId: oldReport.sampleId,
        version: { lt: oldReport.version },
        status: COAReportStatus.FINAL,
      },
      data: {
        status: COAReportStatus.SUPERSEDED,
      },
    });

    // Finalize this report
    const coaReport = await this.prisma.cOAReport.update({
      where: { id },
      data: {
        status: COAReportStatus.FINAL,
        pdfKey,
        reportedAt: new Date(),
        reportedById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        reportedBy: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry
    await this.auditService.logUpdate(
      context,
      'COAReport',
      coaReport.id,
      oldReport,
      coaReport,
    );

    return coaReport;
  }

  /**
   * Get a specific COA report by ID
   * AC: Downloading any version returns its exact, immutable PDF
   */
  async getCOAReport(id: string): Promise<COAReport | null> {
    return this.prisma.cOAReport.findUnique({
      where: { id },
      include: {
        sample: true,
        reportedBy: { select: { id: true, email: true, name: true } },
        approvedBy: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * List all COA reports for a sample
   * AC: Listing a Sample's reports shows all versions with timestamps, authors, and status
   */
  async listCOAReportsForSample(sampleId: string) {
    const reports = await this.prisma.cOAReport.findMany({
      where: { sampleId },
      include: {
        reportedBy: { select: { id: true, email: true, name: true } },
        approvedBy: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { version: 'desc' },
    });

    return reports;
  }

  /**
   * Get the latest COA report for a sample
   */
  async getLatestCOAReport(sampleId: string): Promise<COAReport | null> {
    return this.prisma.cOAReport.findFirst({
      where: { sampleId },
      orderBy: { version: 'desc' },
      include: {
        sample: true,
        reportedBy: { select: { id: true, email: true, name: true } },
        approvedBy: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * Download COA PDF from storage
   * @param pdfKey Storage key for the PDF file
   * @returns PDF as Buffer
   */
  async downloadCOAPdf(pdfKey: string): Promise<Buffer> {
    return this.storageService.getFile(pdfKey);
  }

  /**
   * Approve a COA report (Lab Manager only)
   */
  async approveCOA(id: string, context: AuditContext): Promise<COAReport> {
    const oldReport = await this.prisma.cOAReport.findUnique({
      where: { id },
    });

    if (!oldReport) {
      throw new NotFoundException(`COAReport with ID '${id}' not found`);
    }

    if (oldReport.status !== COAReportStatus.FINAL) {
      throw new BadRequestException('Only FINAL reports can be approved');
    }

    const coaReport = await this.prisma.cOAReport.update({
      where: { id },
      data: {
        approvedById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        reportedBy: { select: { id: true, email: true, name: true } },
        approvedBy: { select: { id: true, email: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry
    await this.auditService.logUpdate(
      context,
      'COAReport',
      coaReport.id,
      oldReport,
      coaReport,
    );

    return coaReport;
  }

  /**
   * Build data snapshot from sample data
   */
  private async buildDataSnapshot(
    sample: any,
    version: number,
    context: AuditContext,
  ): Promise<COADataSnapshot> {
    // Get lab settings
    const labSettings =
      await this.labSettingsService.getOrCreateSettings(context);

    return {
      sample: {
        jobNumber: sample.job.jobNumber,
        dateReceived: sample.dateReceived,
        dateDue: sample.dateDue,
        releaseDate: sample.releaseDate,
        client: {
          name: sample.client.name,
          contactName: sample.client.contactName,
          email: sample.client.email,
          phone: sample.client.phone,
          address: sample.client.address,
        },
        sampleCode: sample.sampleCode,
        rmSupplier: sample.rmSupplier,
        sampleDescription: sample.sampleDescription,
        uinCode: sample.uinCode,
        sampleBatch: sample.sampleBatch,
        temperatureOnReceiptC: sample.temperatureOnReceiptC?.toNumber(),
        storageConditions: sample.storageConditions,
        comments: sample.comments,
        needByDate: sample.job.needByDate,
        mcdDate: sample.job.mcdDate,
        statusFlags: {
          expiredRawMaterial: sample.expiredRawMaterial,
          postIrradiatedRawMaterial: sample.postIrradiatedRawMaterial,
          stabilityStudy: sample.stabilityStudy,
          urgent: sample.urgent,
          allMicroTestsAssigned: sample.allMicroTestsAssigned,
          allChemistryTestsAssigned: sample.allChemistryTestsAssigned,
          released: sample.released,
          retest: sample.retest,
        },
      },
      tests: sample.testAssignments.map((ta: any) => ({
        section: { name: ta.section.name },
        method: {
          code: ta.method.code,
          name: ta.method.name,
          unit: ta.method.unit,
        },
        specification: ta.specification
          ? {
              code: ta.specification.code,
              name: ta.specification.name,
              target: ta.specification.target,
              min: ta.specification.min?.toNumber(),
              max: ta.specification.max?.toNumber(),
              unit: ta.specification.unit,
            }
          : undefined,
        testName:
          ta.customTestName || ta.testDefinition?.name || 'Unnamed Test',
        dueDate: ta.dueDate,
        analyst: ta.analyst
          ? { name: ta.analyst.name, email: ta.analyst.email }
          : undefined,
        status: ta.status,
        testDate: ta.testDate,
        result: ta.result,
        resultUnit: ta.resultUnit,
        checker: ta.checker
          ? { name: ta.checker.name, email: ta.checker.email }
          : undefined,
        chkDate: ta.chkDate,
        oos: ta.oos,
        comments: ta.comments,
        invoiceNote: ta.invoiceNote,
        precision: ta.precision,
        linearity: ta.linearity,
      })),
      reportMetadata: {
        version,
        generatedAt: new Date(),
        generatedBy: context.actorEmail,
        labName: labSettings?.labName || 'Laboratory LIMS Pro',
        labLogoUrl: labSettings?.labLogoUrl || undefined,
        disclaimerText:
          labSettings?.disclaimerText ||
          'This Certificate of Analysis is for the sample as received and tested. Results apply only to the sample tested.',
        templateSettings:
          (labSettings?.coaTemplateSettings as COATemplateSettings) ||
          undefined,
      },
    };
  }

  /**
   * Build HTML snapshot for PDF generation
   * AC: PDF includes all required fields in structured format
   */
  private buildHTMLSnapshot(dataSnapshot: COADataSnapshot): string {
    const { sample, tests, reportMetadata } = dataSnapshot;

    // Helper function to get label with override support
    const getLabel = (field: string, defaultLabel: string): string => {
      return (
        reportMetadata.templateSettings?.labelOverrides?.[field] || defaultLabel
      );
    };

    // Helper function to check if field should be visible
    const isVisible = (field: string): boolean => {
      const visibleFields = reportMetadata.templateSettings?.visibleFields;
      // If no visibleFields specified, all fields are visible by default
      if (!visibleFields || visibleFields.length === 0) return true;
      return visibleFields.includes(field);
    };

    // Helper function to get column order
    const getColumnOrder = (): string[] => {
      return (
        reportMetadata.templateSettings?.columnOrder || [
          'section',
          'test',
          'method',
          'specification',
          'result',
          'unit',
          'testDate',
          'analyst',
          'checkedBy',
          'checkedDate',
          'oos',
          'comments',
        ]
      );
    };

    // Build client info
    const clientInfo = `
      <div class="info-label">Client:</div>
      <div>
        <strong>${sample.client.name}</strong><br/>
        ${sample.client.address ? `${sample.client.address}<br/>` : ''}
        ${sample.client.contactName ? `Contact: ${sample.client.contactName}<br/>` : ''}
        ${sample.client.email ? `Email: ${sample.client.email}<br/>` : ''}
        ${sample.client.phone ? `Phone: ${sample.client.phone}` : ''}
      </div>
    `;

    // Build status flags as chips
    const statusFlags: string[] = [];
    if (sample.statusFlags.expiredRawMaterial)
      statusFlags.push('Expired Raw Material');
    if (sample.statusFlags.postIrradiatedRawMaterial)
      statusFlags.push('Post-Irradiated');
    if (sample.statusFlags.stabilityStudy) statusFlags.push('Stability Study');
    if (sample.statusFlags.urgent) statusFlags.push('URGENT');
    if (sample.statusFlags.retest) statusFlags.push('Retest');

    const statusFlagsHTML =
      statusFlags.length > 0
        ? `<div class="status-flags">${statusFlags.map((f) => `<span class="chip ${f === 'URGENT' ? 'urgent' : ''}">${f}</span>`).join(' ')}</div>`
        : '';

    // Build tests table with improved column structure and dynamic ordering
    const columnOrder = getColumnOrder();

    // Map of column keys to their data accessors and headers
    const columnDefinitions: Record<
      string,
      { header: string; getValue: (test: any) => string }
    > = {
      section: {
        header: getLabel('section', 'Section'),
        getValue: (test) => test.section.name,
      },
      test: {
        header: getLabel('test', 'Test'),
        getValue: (test) => test.testName,
      },
      method: {
        header: getLabel('method', 'Method'),
        getValue: (test) =>
          `${test.method.code}<br/><span class="method-name">${test.method.name}</span>`,
      },
      specification: {
        header: getLabel('specification', 'Specification'),
        getValue: (test) =>
          test.specification
            ? `${test.specification.name}<br/><span class="spec-range">${test.specification.min || ''} - ${test.specification.max || ''} ${test.specification.unit || ''}</span>`
            : 'N/A',
      },
      result: {
        header: getLabel('result', 'Result'),
        getValue: (test) => test.result || 'N/A',
      },
      unit: {
        header: getLabel('unit', 'Unit'),
        getValue: (test) => test.resultUnit || test.method.unit || '',
      },
      testDate: {
        header: getLabel('testDate', 'Test Date'),
        getValue: (test) =>
          test.testDate ? new Date(test.testDate).toLocaleDateString() : 'N/A',
      },
      analyst: {
        header: getLabel('analyst', 'Analyst'),
        getValue: (test) => test.analyst?.name || 'N/A',
      },
      checkedBy: {
        header: getLabel('checkedBy', 'Checked By'),
        getValue: (test) => test.checker?.name || 'N/A',
      },
      checkedDate: {
        header: getLabel('checkedDate', 'Checked Date'),
        getValue: (test) =>
          test.chkDate ? new Date(test.chkDate).toLocaleDateString() : 'N/A',
      },
      oos: {
        header: getLabel('oos', 'OOS'),
        getValue: (test) =>
          `<span class="${test.oos ? 'oos-yes' : ''}">${test.oos ? 'YES' : 'No'}</span>`,
      },
      comments: {
        header: getLabel('comments', 'Comments'),
        getValue: (test) => test.comments || '',
      },
    };

    // Generate table headers based on column order
    const tableHeaders = columnOrder
      .filter((col) => isVisible(col) && columnDefinitions[col])
      .map((col) => `<th>${columnDefinitions[col].header}</th>`)
      .join('');

    // Generate table rows based on column order
    const testsTableRows = tests
      .map((test) => {
        const cells = columnOrder
          .filter((col) => isVisible(col) && columnDefinitions[col])
          .map((col) => {
            const cellClass =
              col === 'comments' ? ' class="comments-cell"' : '';
            return `<td${cellClass}>${columnDefinitions[col].getValue(test)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Analysis - ${sample.sampleCode} - Version ${reportMetadata.version}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
      }
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10pt;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }
    
    .header { 
      text-align: center; 
      margin-bottom: 20px; 
      position: relative;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .logo-container {
      text-align: center;
      margin-bottom: 10px;
    }
    
    .logo {
      max-width: 200px;
      max-height: 60px;
    }
    
    .header h1 { 
      margin: 5px 0; 
      font-size: 1.5em;
      color: #1e40af;
    }
    
    .header h2 { 
      margin: 10px 0 5px 0; 
      font-size: 1.3em;
      color: #1e40af;
    }
    
    .version-badge { 
      position: absolute; 
      top: 0; 
      right: 0; 
      background: #2563eb; 
      color: white; 
      padding: 6px 12px; 
      border-radius: 4px; 
      font-size: 0.95em; 
      font-weight: bold;
    }
    
    .header .meta { 
      font-size: 0.85em; 
      color: #666; 
      margin-top: 5px; 
    }
    
    .section { 
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .section h2 { 
      font-size: 1.1em; 
      border-bottom: 1px solid #999; 
      padding-bottom: 3px;
      margin-bottom: 10px;
      color: #1e40af;
    }
    
    .info-grid { 
      display: grid; 
      grid-template-columns: 160px 1fr; 
      gap: 6px 10px;
      font-size: 0.9em;
    }
    
    .info-label { 
      font-weight: bold;
      color: #333;
    }
    
    .status-flags { 
      margin: 10px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    
    .chip { 
      display: inline-block; 
      padding: 4px 10px; 
      background: #e5e7eb; 
      border-radius: 12px; 
      font-size: 0.85em;
      font-weight: 500;
      color: #374151;
    }
    
    .chip.urgent {
      background: #fee2e2;
      color: #991b1b;
      font-weight: bold;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: 0.85em;
    }
    
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 6px 4px; 
      text-align: left;
      vertical-align: top;
      word-wrap: break-word;
    }
    
    th { 
      background-color: #f3f4f6; 
      font-weight: bold;
      color: #1f2937;
      font-size: 0.9em;
    }
    
    .method-name, .spec-range {
      font-size: 0.85em;
      color: #6b7280;
    }
    
    .oos-yes {
      background-color: #fef2f2;
      color: #991b1b;
      font-weight: bold;
    }
    
    .comments-cell {
      max-width: 120px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    
    .footer { 
      margin-top: 30px;
      font-size: 0.85em;
      border-top: 1px solid #d1d5db;
      padding-top: 15px;
    }
    
    .signatures { 
      display: flex; 
      justify-content: space-between; 
      margin: 30px 0 20px 0;
    }
    
    .signature { 
      width: 45%;
      text-align: center;
    }
    
    .signature-line { 
      border-top: 1px solid #000; 
      margin-top: 40px; 
      padding-top: 5px;
      font-weight: bold;
    }
    
    .disclaimer {
      font-size: 0.8em;
      color: #6b7280;
      font-style: italic;
      margin-top: 20px;
      padding: 10px;
      background-color: #f9fafb;
      border-left: 3px solid #9ca3af;
    }
    
    .page-number {
      text-align: center;
      margin-top: 20px;
      font-size: 0.85em;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="version-badge">Version ${reportMetadata.version}</div>
    ${reportMetadata.labLogoUrl ? `<div class="logo-container"><img src="${reportMetadata.labLogoUrl}" alt="Lab Logo" class="logo" /></div>` : ''}
    <h1>${reportMetadata.labName || 'Laboratory LIMS Pro'}</h1>
    <h2>Certificate of Analysis</h2>
    <div class="meta">Report Date: ${new Date(reportMetadata.generatedAt).toLocaleDateString()}</div>
  </div>

  <div class="section">
    <h2>Client Information</h2>
    <div class="info-grid">
      ${clientInfo}
    </div>
  </div>

  <div class="section">
    <h2>${getLabel('sampleInformation', 'Sample Information')}</h2>
    <div class="info-grid">
      ${isVisible('jobNumber') ? `<div class="info-label">${getLabel('jobNumber', 'Job Number')}:</div><div>${sample.jobNumber}</div>` : ''}
      ${isVisible('sampleCode') ? `<div class="info-label">${getLabel('sampleCode', 'Sample Code')}:</div><div>${sample.sampleCode}</div>` : ''}
      ${isVisible('sampleDescription') ? `<div class="info-label">${getLabel('sampleDescription', 'Description')}:</div><div>${sample.sampleDescription || 'N/A'}</div>` : ''}
      ${isVisible('uinCode') ? `<div class="info-label">${getLabel('uinCode', 'UIN Code')}:</div><div>${sample.uinCode || 'N/A'}</div>` : ''}
      ${isVisible('sampleBatch') ? `<div class="info-label">${getLabel('sampleBatch', 'Batch')}:</div><div>${sample.sampleBatch || 'N/A'}</div>` : ''}
      ${isVisible('dateReceived') ? `<div class="info-label">${getLabel('dateReceived', 'Date Received')}:</div><div>${new Date(sample.dateReceived).toLocaleDateString()}</div>` : ''}
      ${isVisible('dateDue') ? `<div class="info-label">${getLabel('dateDue', 'Date Due')}:</div><div>${sample.dateDue ? new Date(sample.dateDue).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('needByDate') ? `<div class="info-label">${getLabel('needByDate', 'Need By Date')}:</div><div>${sample.needByDate ? new Date(sample.needByDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('mcdDate') ? `<div class="info-label">${getLabel('mcdDate', 'MCD Date')}:</div><div>${sample.mcdDate ? new Date(sample.mcdDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('releaseDate') ? `<div class="info-label">${getLabel('releaseDate', 'Release Date')}:</div><div>${sample.releaseDate ? new Date(sample.releaseDate).toLocaleDateString() : 'N/A'}</div>` : ''}
      ${isVisible('rmSupplier') ? `<div class="info-label">${getLabel('rmSupplier', 'RM Supplier')}:</div><div>${sample.rmSupplier || 'N/A'}</div>` : ''}
      ${isVisible('temperatureOnReceiptC') ? `<div class="info-label">${getLabel('temperatureOnReceiptC', 'Temperature on Receipt')}:</div><div>${sample.temperatureOnReceiptC ? sample.temperatureOnReceiptC + '°C' : 'N/A'}</div>` : ''}
      ${isVisible('storageConditions') ? `<div class="info-label">${getLabel('storageConditions', 'Storage Conditions')}:</div><div>${sample.storageConditions || 'N/A'}</div>` : ''}
      ${isVisible('comments') && sample.comments ? `<div class="info-label">${getLabel('comments', 'Comments')}:</div><div>${sample.comments}</div>` : ''}
    </div>
    ${statusFlagsHTML}
  </div>

  <div class="section">
    <h2>${getLabel('testResults', 'Test Results')}</h2>
    <table>
      <thead>
        <tr>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>
        ${testsTableRows}
      </tbody>
    </table>
  </div>

  <div class="signatures">
    <div class="signature">
      <div class="signature-line">Prepared By</div>
      <div>${reportMetadata.generatedBy}</div>
      <div>${new Date(reportMetadata.generatedAt).toLocaleDateString()}</div>
    </div>
    <div class="signature">
      <div class="signature-line">Reviewed By</div>
      <div>&nbsp;</div>
      <div>Date: _______________</div>
    </div>
  </div>

  <div class="footer">
    <div class="disclaimer">
      ${reportMetadata.disclaimerText}
    </div>
    <div class="page-number">Page 1 of 1</div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Preview COA for a sample (returns rendered HTML + JSON snapshot)
   */
  async previewCOA(sampleId: string, context: AuditContext) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      include: {
        client: true,
        job: true,
        testAssignments: {
          include: {
            testDefinition: true,
            section: true,
            method: true,
            specification: true,
          },
        },
      },
    });

    if (!sample) {
      throw new Error(`Sample with ID '${sampleId}' not found`);
    }

    const dataSnapshot = await this.buildDataSnapshot(
      sample as any,
      0,
      context,
    );
    const htmlSnapshot = this.buildHTMLSnapshot(dataSnapshot);

    const jsonSnapshot = {
      sample: {
        id: sample.id,
        sampleCode: sample.sampleCode,
        dateReceived: sample.dateReceived,
        description: sample.sampleDescription,
      },
      client: {
        id: sample.client.id,
        name: sample.client.name,
      },
      tests: sample.testAssignments.map((ta) => ({
        testName: ta.testDefinition?.name || 'N/A',
        section: ta.section.name,
        method: ta.method.name,
        result: ta.result,
        unit: ta.method.unit,
        specification: ta.specification?.name,
        status: ta.status,
        oos: ta.oos,
      })),
    };

    return {
      htmlSnapshot,
      jsonSnapshot,
      sampleId: sample.id,
      sampleCode: sample.sampleCode,
    };
  }

  /**
   * Export COA for a sample (creates/increments version; returns PDF URL)
   * AC: Every export creates a new version, generates PDF, stores in MinIO, and marks previous FINAL as SUPERSEDED
   */
  async exportCOA(sampleId: string, context: AuditContext) {
    const sample = await this.prisma.sample.findUnique({
      where: { id: sampleId },
      include: {
        client: true,
        job: true,
        testAssignments: {
          include: {
            testDefinition: true,
            section: true,
            method: true,
            specification: true,
            analyst: { select: { id: true, email: true, name: true } },
            checker: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundException(`Sample with ID '${sampleId}' not found`);
    }

    // Get the latest version number for this sample
    const latestReport = await this.prisma.cOAReport.findFirst({
      where: { sampleId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latestReport?.version || 0) + 1;

    // Step 1: Build data snapshot from current Sample + Tests (only those included in the report)
    const dataSnapshot = await this.buildDataSnapshot(
      sample as any,
      newVersion,
      context,
    );

    // Step 2: Render HTML using the active template and snapshot; store htmlSnapshot
    const htmlSnapshot = this.buildHTMLSnapshot(dataSnapshot);

    // Step 3: Convert to PDF; store files in admin defined location as per env file
    const pdfBuffer = await this.pdfService.generatePdfFromHtml(htmlSnapshot);

    // Generate storage key for PDF
    const pdfStoragePath = this.configService.get<string>(
      'PDF_STORAGE_PATH',
      'coa-reports',
    );
    const pdfKey = `${pdfStoragePath}/${sample.sampleCode}-v${newVersion}-${Date.now()}.pdf`;

    // Upload PDF to storage
    await this.storageService.uploadFile(pdfKey, pdfBuffer, 'application/pdf');

    // Step 5: Mark previous final as superseded if applicable
    await this.prisma.cOAReport.updateMany({
      where: {
        sampleId,
        status: COAReportStatus.FINAL,
      },
      data: {
        status: COAReportStatus.SUPERSEDED,
      },
    });

    // Step 4: Increment version for (sampleId) and persist COAReport row
    const report = await this.prisma.cOAReport.create({
      data: {
        sampleId,
        version: newVersion,
        status: COAReportStatus.FINAL,
        htmlSnapshot,
        dataSnapshot: dataSnapshot as any,
        pdfKey,
        reportedAt: new Date(),
        createdById: context.actorId,
        updatedById: context.actorId,
        reportedById: context.actorId,
      },
    });

    // Log audit entry
    await this.auditService.logCreate(context, 'COAReport', report.id, report);

    return {
      id: report.id,
      version: report.version,
      pdfUrl: `/api/coa/${report.id}/download`,
      pdfKey: report.pdfKey,
      status: report.status,
      message: `COA version ${newVersion} created and finalized successfully`,
    };
  }
}
