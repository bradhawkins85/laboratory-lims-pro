import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JobStatus } from '@prisma/client';

describe('JobsService', () => {
  let service: JobsService;
  let prismaService: PrismaService;
  let auditService: AuditService;

  const mockPrismaService = {
    job: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJob', () => {
    it('should create a job with unique jobNumber', async () => {
      const dto = {
        jobNumber: 'JOB-001',
        clientId: 'client-123',
        status: JobStatus.DRAFT,
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      mockPrismaService.job.findUnique.mockResolvedValue(null);
      mockPrismaService.job.create.mockResolvedValue({
        id: 'job-123',
        ...dto,
        createdById: context.actorId,
        updatedById: context.actorId,
      });

      const result = await service.createJob(dto, context);

      expect(result).toBeDefined();
      expect(result.jobNumber).toBe('JOB-001');
      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        context,
        'Job',
        'job-123',
        expect.any(Object),
      );
    });

    it('should throw ConflictException if jobNumber already exists', async () => {
      const dto = {
        jobNumber: 'JOB-001',
        clientId: 'client-123',
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      mockPrismaService.job.findUnique.mockResolvedValue({
        id: 'existing-job',
        jobNumber: 'JOB-001',
      });

      await expect(service.createJob(dto, context)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.job.create).not.toHaveBeenCalled();
    });
  });

  describe('updateJob', () => {
    it('should update a job and log audit entry', async () => {
      const jobId = 'job-123';
      const dto = {
        status: JobStatus.ACTIVE,
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldJob = {
        id: jobId,
        jobNumber: 'JOB-001',
        status: JobStatus.DRAFT,
      };

      const updatedJob = {
        ...oldJob,
        ...dto,
        updatedById: context.actorId,
      };

      mockPrismaService.job.findUnique.mockResolvedValue(oldJob);
      mockPrismaService.job.update.mockResolvedValue(updatedJob);

      const result = await service.updateJob(jobId, dto, context);

      expect(result.status).toBe(JobStatus.ACTIVE);
      expect(mockAuditService.logUpdate).toHaveBeenCalledWith(
        context,
        'Job',
        jobId,
        oldJob,
        updatedJob,
      );
    });

    it('should throw NotFoundException if job does not exist', async () => {
      const jobId = 'non-existent';
      const dto = { status: JobStatus.ACTIVE };
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      mockPrismaService.job.findUnique.mockResolvedValue(null);

      await expect(service.updateJob(jobId, dto, context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listJobs', () => {
    it('should list jobs with pagination', async () => {
      const mockJobs = [
        { id: 'job-1', jobNumber: 'JOB-001' },
        { id: 'job-2', jobNumber: 'JOB-002' },
      ];

      mockPrismaService.job.findMany.mockResolvedValue(mockJobs);
      mockPrismaService.job.count.mockResolvedValue(2);

      const result = await service.listJobs({ page: 1, perPage: 10 });

      expect(result.jobs).toEqual(mockJobs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });
});
