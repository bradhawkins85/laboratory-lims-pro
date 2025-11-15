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
import { COAReport, COAReportStatus } from '@prisma/client';

export interface BuildCOADto {
  sampleId: string;
  notes?: string;
  includeFields?: string[]; // Optional: specify which fields to include
}

export interface COADataSnapshot {
  sample: {
    jobNumber: string;
    dateReceived: Date;
    dateDue?: Date;
    client: {
      name: string;
      contactName?: string;
      email?: string;
      phone?: string;
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
    const dataSnapshot = this.buildDataSnapshot(sample, nextVersion, context);

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
  private buildDataSnapshot(
    sample: any,
    version: number,
    context: AuditContext,
  ): COADataSnapshot {
    return {
      sample: {
        jobNumber: sample.job.jobNumber,
        dateReceived: sample.dateReceived,
        dateDue: sample.dateDue,
        client: {
          name: sample.client.name,
          contactName: sample.client.contactName,
          email: sample.client.email,
          phone: sample.client.phone,
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
        labName: 'Laboratory LIMS Pro', // TODO: Make this configurable
      },
    };
  }

  /**
   * Build HTML snapshot for PDF generation
   * AC: PDF includes all required fields in structured format
   */
  private buildHTMLSnapshot(dataSnapshot: COADataSnapshot): string {
    const { sample, tests, reportMetadata } = dataSnapshot;

    // Build status flags as tags
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
        ? `<div class="status-flags">${statusFlags.map((f) => `<span class="flag">${f}</span>`).join(' ')}</div>`
        : '';

    // Build tests table
    const testsTableRows = tests
      .map(
        (test) => `
      <tr>
        <td>${test.section.name}</td>
        <td>${test.method.code} - ${test.method.name}</td>
        <td>${test.specification ? `${test.specification.code} - ${test.specification.name} (${test.specification.min || ''}-${test.specification.max || ''} ${test.specification.unit || ''})` : 'N/A'}</td>
        <td>${test.testName}</td>
        <td>${test.dueDate ? new Date(test.dueDate).toLocaleDateString() : 'N/A'}</td>
        <td>${test.analyst?.name || 'N/A'}</td>
        <td>${test.status}</td>
        <td>${test.testDate ? new Date(test.testDate).toLocaleDateString() : 'N/A'}</td>
        <td>${test.result || 'N/A'} ${test.resultUnit || ''}</td>
        <td>${test.checker?.name || 'N/A'}</td>
        <td>${test.chkDate ? new Date(test.chkDate).toLocaleDateString() : 'N/A'}</td>
        <td>${test.oos ? 'YES' : 'No'}</td>
        <td>${test.comments || ''}</td>
      </tr>
    `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate of Analysis - ${sample.sampleCode} - Version ${reportMetadata.version}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; position: relative; }
    .header h1 { margin: 0; font-size: 1.8em; }
    .header h2 { margin: 10px 0; font-size: 1.4em; }
    .version-badge { 
      position: absolute; 
      top: 0; 
      right: 0; 
      background: #2563eb; 
      color: white; 
      padding: 8px 15px; 
      border-radius: 5px; 
      font-size: 1.1em; 
      font-weight: bold;
    }
    .header .meta { font-size: 0.9em; color: #666; margin-top: 10px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 1.2em; border-bottom: 2px solid #333; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; }
    .info-label { font-weight: bold; }
    .status-flags { margin: 10px 0; }
    .flag { display: inline-block; padding: 5px 10px; margin: 2px; background: #f0f0f0; border-radius: 3px; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.85em; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .footer { margin-top: 40px; font-size: 0.9em; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
    .signature { width: 45%; }
    .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="version-badge">Version ${reportMetadata.version}</div>
    <h1>${reportMetadata.labName || 'Laboratory LIMS Pro'}</h1>
    <h2>Certificate of Analysis</h2>
    <div class="meta">Generated: ${new Date(reportMetadata.generatedAt).toLocaleString()}</div>
  </div>
  </div>

  <div class="section">
    <h2>Sample Information</h2>
    <div class="info-grid">
      <div class="info-label">Job Number:</div><div>${sample.jobNumber}</div>
      <div class="info-label">Sample Code:</div><div>${sample.sampleCode}</div>
      <div class="info-label">Client:</div><div>${sample.client.name}</div>
      <div class="info-label">Date Received:</div><div>${new Date(sample.dateReceived).toLocaleDateString()}</div>
      <div class="info-label">Date Due:</div><div>${sample.dateDue ? new Date(sample.dateDue).toLocaleDateString() : 'N/A'}</div>
      <div class="info-label">Need By Date:</div><div>${sample.needByDate ? new Date(sample.needByDate).toLocaleDateString() : 'N/A'}</div>
      <div class="info-label">MCD Date:</div><div>${sample.mcdDate ? new Date(sample.mcdDate).toLocaleDateString() : 'N/A'}</div>
      <div class="info-label">RM Supplier:</div><div>${sample.rmSupplier || 'N/A'}</div>
      <div class="info-label">Description:</div><div>${sample.sampleDescription || 'N/A'}</div>
      <div class="info-label">UIN Code:</div><div>${sample.uinCode || 'N/A'}</div>
      <div class="info-label">Batch:</div><div>${sample.sampleBatch || 'N/A'}</div>
      <div class="info-label">Temperature on Receipt:</div><div>${sample.temperatureOnReceiptC ? sample.temperatureOnReceiptC + '°C' : 'N/A'}</div>
      <div class="info-label">Storage Conditions:</div><div>${sample.storageConditions || 'N/A'}</div>
      <div class="info-label">Comments:</div><div>${sample.comments || 'N/A'}</div>
    </div>
    ${statusFlagsHTML}
  </div>

  <div class="section">
    <h2>Test Results</h2>
    <table>
      <thead>
        <tr>
          <th>Section</th>
          <th>Method</th>
          <th>Specification</th>
          <th>Test</th>
          <th>Due</th>
          <th>Analyst</th>
          <th>Status</th>
          <th>Test Date</th>
          <th>Result</th>
          <th>Chk By</th>
          <th>Chk Date</th>
          <th>OOS</th>
          <th>Comments</th>
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
      <div>_____________________</div>
      <div>Date: _____________________</div>
    </div>
  </div>

  <div class="footer">
    <p><em>This Certificate of Analysis is for the sample as received and tested. Results apply only to the sample tested.</em></p>
    <p>Page 1 of 1</p>
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

    const dataSnapshot = this.buildDataSnapshot(sample as any, 0, context);
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
    const dataSnapshot = this.buildDataSnapshot(
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
