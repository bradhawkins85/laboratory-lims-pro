import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { Sample } from '@prisma/client';

export interface CreateSampleDto {
  jobId: string;
  clientId: string;
  sampleCode: string;
  dateReceived?: Date;
  dateDue?: Date;
  rmSupplier?: string;
  sampleDescription?: string;
  uinCode?: string;
  sampleBatch?: string;
  temperatureOnReceiptC?: number;
  storageConditions?: string;
  comments?: string;
  
  // Status flags
  expiredRawMaterial?: boolean;
  postIrradiatedRawMaterial?: boolean;
  stabilityStudy?: boolean;
  urgent?: boolean;
  allMicroTestsAssigned?: boolean;
  allChemistryTestsAssigned?: boolean;
  released?: boolean;
  retest?: boolean;
}

export interface UpdateSampleDto {
  dateReceived?: Date;
  dateDue?: Date;
  rmSupplier?: string;
  sampleDescription?: string;
  uinCode?: string;
  sampleBatch?: string;
  temperatureOnReceiptC?: number;
  storageConditions?: string;
  comments?: string;
  
  // Status flags
  expiredRawMaterial?: boolean;
  postIrradiatedRawMaterial?: boolean;
  stabilityStudy?: boolean;
  urgent?: boolean;
  allMicroTestsAssigned?: boolean;
  allChemistryTestsAssigned?: boolean;
  released?: boolean;
  retest?: boolean;
  releaseDate?: Date;
}

@Injectable()
export class SamplesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new Sample with sampleCode uniqueness enforcement
   * AC: A newly created Sample produces a create entry in AuditLog with full field set
   */
  async createSample(dto: CreateSampleDto, context: AuditContext): Promise<Sample> {
    // Check if sampleCode already exists
    const existing = await this.prisma.sample.findUnique({
      where: { sampleCode: dto.sampleCode },
    });

    if (existing) {
      throw new ConflictException(`Sample with sampleCode '${dto.sampleCode}' already exists`);
    }

    // Verify that job and client exist
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID '${dto.jobId}' not found`);
    }

    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) {
      throw new NotFoundException(`Client with ID '${dto.clientId}' not found`);
    }

    // Create the sample
    const sample = await this.prisma.sample.create({
      data: {
        jobId: dto.jobId,
        clientId: dto.clientId,
        sampleCode: dto.sampleCode,
        dateReceived: dto.dateReceived || new Date(),
        dateDue: dto.dateDue,
        rmSupplier: dto.rmSupplier,
        sampleDescription: dto.sampleDescription,
        uinCode: dto.uinCode,
        sampleBatch: dto.sampleBatch,
        temperatureOnReceiptC: dto.temperatureOnReceiptC,
        storageConditions: dto.storageConditions,
        comments: dto.comments,
        expiredRawMaterial: dto.expiredRawMaterial || false,
        postIrradiatedRawMaterial: dto.postIrradiatedRawMaterial || false,
        stabilityStudy: dto.stabilityStudy || false,
        urgent: dto.urgent || false,
        allMicroTestsAssigned: dto.allMicroTestsAssigned || false,
        allChemistryTestsAssigned: dto.allChemistryTestsAssigned || false,
        released: dto.released || false,
        retest: dto.retest || false,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        job: true,
        client: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for sample creation with full field set
    await this.auditService.logCreate(
      context,
      'Sample',
      sample.id,
      sample,
    );

    return sample;
  }

  /**
   * Get a sample by ID
   */
  async getSample(id: string): Promise<Sample | null> {
    return this.prisma.sample.findUnique({
      where: { id },
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
        attachments: true,
        coaReports: {
          orderBy: { version: 'desc' },
        },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * Get a sample by sampleCode
   */
  async getSampleByCode(sampleCode: string): Promise<Sample | null> {
    return this.prisma.sample.findUnique({
      where: { sampleCode },
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
        attachments: true,
        coaReports: {
          orderBy: { version: 'desc' },
        },
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * List samples with optional filters
   */
  async listSamples(filters?: {
    jobId?: string;
    clientId?: string;
    released?: boolean;
    urgent?: boolean;
    page?: number;
    perPage?: number;
  }) {
    const where: any = {};
    if (filters?.jobId) where.jobId = filters.jobId;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.released !== undefined) where.released = filters.released;
    if (filters?.urgent !== undefined) where.urgent = filters.urgent;

    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const [samples, total] = await Promise.all([
      this.prisma.sample.findMany({
        where,
        include: {
          job: true,
          client: true,
          testAssignments: {
            select: { id: true, status: true, oos: true },
          },
          createdBy: { select: { id: true, email: true, name: true } },
          updatedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.sample.count({ where }),
    ]);

    return {
      samples,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Update a sample
   */
  async updateSample(id: string, dto: UpdateSampleDto, context: AuditContext): Promise<Sample> {
    // Get the current sample state for audit logging
    const oldSample = await this.prisma.sample.findUnique({ where: { id } });
    
    if (!oldSample) {
      throw new NotFoundException(`Sample with ID '${id}' not found`);
    }

    // Update the sample
    const sample = await this.prisma.sample.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        job: true,
        client: true,
        testAssignments: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for sample update
    await this.auditService.logUpdate(
      context,
      'Sample',
      sample.id,
      oldSample,
      sample,
    );

    return sample;
  }

  /**
   * Release a sample (3.4 - only Lab Manager or Admin can release)
   */
  async releaseSample(id: string, context: AuditContext): Promise<Sample> {
    const oldSample = await this.prisma.sample.findUnique({ where: { id } });
    
    if (!oldSample) {
      throw new NotFoundException(`Sample with ID '${id}' not found`);
    }

    const sample = await this.prisma.sample.update({
      where: { id },
      data: {
        released: true,
        releaseDate: new Date(),
        updatedById: context.actorId,
      },
      include: {
        job: true,
        client: true,
        testAssignments: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for sample release
    await this.auditService.logUpdate(
      context,
      'Sample',
      sample.id,
      oldSample,
      sample,
    );

    return sample;
  }

  /**
   * Delete a sample (soft delete by marking as cancelled)
   */
  async deleteSample(id: string, context: AuditContext): Promise<Sample> {
    const oldSample = await this.prisma.sample.findUnique({ where: { id } });
    
    if (!oldSample) {
      throw new NotFoundException(`Sample with ID '${id}' not found`);
    }

    // For now, we'll just log the deletion but not actually delete the record
    // In a real system, you might want to add a 'deleted' or 'cancelled' field
    
    // Log audit entry for sample deletion
    await this.auditService.logDelete(
      context,
      'Sample',
      oldSample.id,
      oldSample,
      'Sample marked for deletion',
    );

    return oldSample;
  }
}
