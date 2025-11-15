import { Test, TestingModule } from '@nestjs/testing';
import { COAReportsService } from './coa-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PdfService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { LabSettingsService } from '../lab-settings/lab-settings.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { COAReportStatus } from '@prisma/client';

describe('COAReportsService - Versioning', () => {
  let service: COAReportsService;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let pdfService: PdfService;
  let storageService: StorageService;
  let configService: ConfigService;
  let labSettingsService: any;

  const mockPrismaService = {
    sample: {
      findUnique: jest.fn(),
    },
    cOAReport: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
  };

  const mockPdfService = {
    generatePdfFromHtml: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    getFile: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'PDF_STORAGE_PATH') return 'coa-reports';
      return defaultValue;
    }),
  };

  const mockLabSettingsService = {
    getOrCreateSettings: jest.fn().mockResolvedValue({
      id: 'settings-123',
      labName: 'Laboratory LIMS Pro',
      labLogoUrl: null,
      disclaimerText:
        'This Certificate of Analysis is for the sample as received and tested. Results apply only to the sample tested.',
      coaTemplateSettings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'user-123',
      updatedById: 'user-123',
    }),
  };

  const mockContext = {
    actorId: 'user-123',
    actorEmail: 'test@example.com',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  const mockSample = {
    id: 'sample-123',
    sampleCode: 'SAMPLE-001',
    dateReceived: new Date(),
    dateDue: new Date(),
    client: {
      id: 'client-123',
      name: 'Test Client',
      contactName: 'John Doe',
      email: 'john@test.com',
      phone: '123-456-7890',
    },
    job: {
      id: 'job-123',
      jobNumber: 'JOB-001',
      needByDate: new Date(),
      mcdDate: new Date(),
    },
    rmSupplier: 'Test Supplier',
    sampleDescription: 'Test Description',
    uinCode: 'UIN-001',
    sampleBatch: 'BATCH-001',
    temperatureOnReceiptC: { toNumber: () => 25.0 } as any,
    storageConditions: 'Room Temperature',
    comments: 'Test comments',
    expiredRawMaterial: false,
    postIrradiatedRawMaterial: false,
    stabilityStudy: false,
    urgent: false,
    allMicroTestsAssigned: true,
    allChemistryTestsAssigned: true,
    released: true,
    retest: false,
    testAssignments: [
      {
        id: 'test-1',
        section: { name: 'Chemistry' },
        method: { code: 'M001', name: 'Test Method', unit: 'mg/L' },
        specification: {
          code: 'S001',
          name: 'Test Spec',
          min: { toNumber: () => 0 } as any,
          max: { toNumber: () => 100 } as any,
          unit: 'mg/L',
        },
        testDefinition: { name: 'Test 1' },
        customTestName: null,
        dueDate: new Date(),
        analyst: { name: 'Analyst 1', email: 'analyst1@test.com' },
        status: 'COMPLETED',
        testDate: new Date(),
        result: '50',
        resultUnit: 'mg/L',
        checker: { name: 'Checker 1', email: 'checker1@test.com' },
        chkDate: new Date(),
        oos: false,
        comments: null,
        invoiceNote: null,
        precision: null,
        linearity: null,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        COAReportsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LabSettingsService,
          useValue: mockLabSettingsService,
        },
      ],
    }).compile();

    service = module.get<COAReportsService>(COAReportsService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    pdfService = module.get<PdfService>(PdfService);
    storageService = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
    labSettingsService = module.get<LabSettingsService>(LabSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportCOA', () => {
    it('should create version 1 for a new sample', async () => {
      mockPrismaService.sample.findUnique.mockResolvedValue(mockSample);
      mockPrismaService.cOAReport.findFirst.mockResolvedValue(null);
      mockPdfService.generatePdfFromHtml.mockResolvedValue(
        Buffer.from('pdf-content'),
      );
      mockStorageService.uploadFile.mockResolvedValue(
        'coa-reports/SAMPLE-001-v1-12345.pdf',
      );
      mockPrismaService.cOAReport.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.cOAReport.create.mockResolvedValue({
        id: 'coa-123',
        sampleId: 'sample-123',
        version: 1,
        status: COAReportStatus.FINAL,
        pdfKey: 'coa-reports/SAMPLE-001-v1-12345.pdf',
        dataSnapshot: {},
        htmlSnapshot: '<html></html>',
        reportedAt: new Date(),
        createdById: mockContext.actorId,
        updatedById: mockContext.actorId,
        reportedById: mockContext.actorId,
      });

      const result = await service.exportCOA('sample-123', mockContext);

      expect(result.version).toBe(1);
      expect(result.status).toBe(COAReportStatus.FINAL);
      expect(mockPdfService.generatePdfFromHtml).toHaveBeenCalled();
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining('coa-reports/SAMPLE-001-v1'),
        expect.any(Buffer),
        'application/pdf',
      );
      expect(mockAuditService.logCreate).toHaveBeenCalled();
    });

    it('should increment version for existing sample', async () => {
      mockPrismaService.sample.findUnique.mockResolvedValue(mockSample);
      mockPrismaService.cOAReport.findFirst.mockResolvedValue({
        id: 'coa-old',
        version: 2,
        status: COAReportStatus.FINAL,
      });
      mockPdfService.generatePdfFromHtml.mockResolvedValue(
        Buffer.from('pdf-content'),
      );
      mockStorageService.uploadFile.mockResolvedValue(
        'coa-reports/SAMPLE-001-v3-12345.pdf',
      );
      mockPrismaService.cOAReport.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.cOAReport.create.mockResolvedValue({
        id: 'coa-new',
        sampleId: 'sample-123',
        version: 3,
        status: COAReportStatus.FINAL,
        pdfKey: 'coa-reports/SAMPLE-001-v3-12345.pdf',
        dataSnapshot: {},
        htmlSnapshot: '<html></html>',
        reportedAt: new Date(),
        createdById: mockContext.actorId,
        updatedById: mockContext.actorId,
        reportedById: mockContext.actorId,
      });

      const result = await service.exportCOA('sample-123', mockContext);

      expect(result.version).toBe(3);
      expect(mockPrismaService.cOAReport.updateMany).toHaveBeenCalledWith({
        where: {
          sampleId: 'sample-123',
          status: COAReportStatus.FINAL,
        },
        data: {
          status: COAReportStatus.SUPERSEDED,
        },
      });
    });

    it('should mark previous FINAL reports as SUPERSEDED', async () => {
      mockPrismaService.sample.findUnique.mockResolvedValue(mockSample);
      mockPrismaService.cOAReport.findFirst.mockResolvedValue({
        version: 1,
        status: COAReportStatus.FINAL,
      });
      mockPdfService.generatePdfFromHtml.mockResolvedValue(
        Buffer.from('pdf-content'),
      );
      mockStorageService.uploadFile.mockResolvedValue(
        'coa-reports/SAMPLE-001-v2-12345.pdf',
      );
      mockPrismaService.cOAReport.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.cOAReport.create.mockResolvedValue({
        id: 'coa-new',
        version: 2,
        status: COAReportStatus.FINAL,
        pdfKey: 'coa-reports/SAMPLE-001-v2-12345.pdf',
      } as any);

      await service.exportCOA('sample-123', mockContext);

      expect(mockPrismaService.cOAReport.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sampleId: 'sample-123',
            status: COAReportStatus.FINAL,
          },
          data: {
            status: COAReportStatus.SUPERSEDED,
          },
        }),
      );
    });

    it('should throw NotFoundException if sample not found', async () => {
      mockPrismaService.sample.findUnique.mockResolvedValue(null);

      await expect(
        service.exportCOA('non-existent', mockContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('finalizeCOA', () => {
    it('should finalize a DRAFT report and generate PDF', async () => {
      const draftReport = {
        id: 'coa-draft',
        sampleId: 'sample-123',
        version: 1,
        status: COAReportStatus.DRAFT,
        htmlSnapshot: '<html>Draft COA</html>',
        pdfKey: null,
        sample: { sampleCode: 'SAMPLE-001' },
      };

      mockPrismaService.cOAReport.findUnique.mockResolvedValue(draftReport);
      mockPdfService.generatePdfFromHtml.mockResolvedValue(
        Buffer.from('pdf-content'),
      );
      mockStorageService.uploadFile.mockResolvedValue(
        'coa-reports/SAMPLE-001-v1-12345.pdf',
      );
      mockPrismaService.cOAReport.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.cOAReport.update.mockResolvedValue({
        ...draftReport,
        status: COAReportStatus.FINAL,
        pdfKey: 'coa-reports/SAMPLE-001-v1-12345.pdf',
        reportedAt: new Date(),
        sample: {},
        reportedBy: null,
        createdBy: null,
        updatedBy: null,
      });

      const result = await service.finalizeCOA('coa-draft', mockContext);

      expect(result.status).toBe(COAReportStatus.FINAL);
      expect(mockPdfService.generatePdfFromHtml).toHaveBeenCalledWith(
        draftReport.htmlSnapshot,
      );
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException if report is not DRAFT', async () => {
      mockPrismaService.cOAReport.findUnique.mockResolvedValue({
        id: 'coa-final',
        status: COAReportStatus.FINAL,
        sample: {},
      });

      await expect(
        service.finalizeCOA('coa-final', mockContext),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if report not found', async () => {
      mockPrismaService.cOAReport.findUnique.mockResolvedValue(null);

      await expect(
        service.finalizeCOA('non-existent', mockContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadCOAPdf', () => {
    it('should download PDF from storage', async () => {
      const pdfBuffer = Buffer.from('pdf-content');
      mockStorageService.getFile.mockResolvedValue(pdfBuffer);

      const result = await service.downloadCOAPdf(
        'coa-reports/SAMPLE-001-v1.pdf',
      );

      expect(result).toEqual(pdfBuffer);
      expect(mockStorageService.getFile).toHaveBeenCalledWith(
        'coa-reports/SAMPLE-001-v1.pdf',
      );
    });
  });
});
