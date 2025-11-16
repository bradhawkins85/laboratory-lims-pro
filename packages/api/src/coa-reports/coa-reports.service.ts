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
import {
  renderCOATemplate,
  COADataSnapshot,
  COATemplateSettings,
} from '../modules/coa/renderer';

export interface BuildCOADto {
  sampleId: string;
  notes?: string;
  includeFields?: string[]; // Optional: specify which fields to include
}

// Re-export for backward compatibility
export type { COADataSnapshot, COATemplateSettings };

// Legacy interface - kept for backward compatibility
export interface COATemplateSettingsLegacy {
  visibleFields?: string[];
  labelOverrides?: Record<string, string>;
  columnOrder?: string[];
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
    return renderCOATemplate(dataSnapshot);
  }
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
