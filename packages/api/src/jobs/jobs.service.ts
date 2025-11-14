import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { Job, JobStatus } from '@prisma/client';

export interface CreateJobDto {
  jobNumber: string;
  clientId: string;
  needByDate?: Date;
  mcdDate?: Date;
  status?: JobStatus;
  quoteNumber?: string;
  poNumber?: string;
  soNumber?: string;
  amountExTax?: number;
  invoiced?: boolean;
}

export interface UpdateJobDto {
  needByDate?: Date;
  mcdDate?: Date;
  status?: JobStatus;
  quoteNumber?: string;
  poNumber?: string;
  soNumber?: string;
  amountExTax?: number;
  invoiced?: boolean;
}

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a new Job with jobNumber uniqueness enforcement
   */
  async createJob(dto: CreateJobDto, context: AuditContext): Promise<Job> {
    // Check if jobNumber already exists
    const existing = await this.prisma.job.findUnique({
      where: { jobNumber: dto.jobNumber },
    });

    if (existing) {
      throw new ConflictException(`Job with jobNumber '${dto.jobNumber}' already exists`);
    }

    // Create the job
    const job = await this.prisma.job.create({
      data: {
        jobNumber: dto.jobNumber,
        clientId: dto.clientId,
        needByDate: dto.needByDate,
        mcdDate: dto.mcdDate,
        status: dto.status || JobStatus.DRAFT,
        quoteNumber: dto.quoteNumber,
        poNumber: dto.poNumber,
        soNumber: dto.soNumber,
        amountExTax: dto.amountExTax,
        invoiced: dto.invoiced || false,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        client: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for job creation
    await this.auditService.logCreate(
      context,
      'Job',
      job.id,
      job,
    );

    return job;
  }

  /**
   * Get a job by ID
   */
  async getJob(id: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        client: true,
        samples: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * Get a job by jobNumber
   */
  async getJobByNumber(jobNumber: string): Promise<Job | null> {
    return this.prisma.job.findUnique({
      where: { jobNumber },
      include: {
        client: true,
        samples: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });
  }

  /**
   * List all jobs with optional filters
   */
  async listJobs(filters?: {
    clientId?: string;
    status?: JobStatus;
    page?: number;
    perPage?: number;
  }) {
    const where: any = {};
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.status) where.status = filters.status;

    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        include: {
          client: true,
          samples: { select: { id: true, sampleCode: true } },
          createdBy: { select: { id: true, email: true, name: true } },
          updatedBy: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Update a job
   */
  async updateJob(id: string, dto: UpdateJobDto, context: AuditContext): Promise<Job> {
    // Get the current job state for audit logging
    const oldJob = await this.prisma.job.findUnique({ where: { id } });
    
    if (!oldJob) {
      throw new NotFoundException(`Job with ID '${id}' not found`);
    }

    // Update the job
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        client: true,
        samples: true,
        createdBy: { select: { id: true, email: true, name: true } },
        updatedBy: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for job update
    await this.auditService.logUpdate(
      context,
      'Job',
      job.id,
      oldJob,
      job,
    );

    return job;
  }

  /**
   * Delete a job (soft delete by setting status to CANCELLED)
   */
  async deleteJob(id: string, context: AuditContext): Promise<Job> {
    const oldJob = await this.prisma.job.findUnique({ where: { id } });
    
    if (!oldJob) {
      throw new NotFoundException(`Job with ID '${id}' not found`);
    }

    // Update status to CANCELLED instead of hard delete
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.CANCELLED,
        updatedById: context.actorId,
      },
    });

    // Log audit entry for job deletion
    await this.auditService.logDelete(
      context,
      'Job',
      job.id,
      oldJob,
      'Job cancelled',
    );

    return job;
  }
}
