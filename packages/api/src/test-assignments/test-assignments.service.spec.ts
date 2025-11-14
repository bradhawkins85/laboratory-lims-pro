import { Test, TestingModule } from '@nestjs/testing';
import { TestAssignmentsService } from './test-assignments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TestAssignmentStatus } from '@prisma/client';

describe('TestAssignmentsService', () => {
  let service: TestAssignmentsService;
  let prismaService: PrismaService;
  let auditService: AuditService;

  const mockPrismaService = {
    sample: {
      findUnique: jest.fn(),
    },
    testAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    testDefinition: {
      findUnique: jest.fn(),
    },
    testPack: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    generateTxId: jest.fn(() => 'tx-123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAssignmentsService,
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

    service = module.get<TestAssignmentsService>(TestAssignmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enterResult', () => {
    it('should enter result and compute OOS correctly', async () => {
      const testAssignmentId = 'ta-123';
      const dto = {
        result: '150',
        resultUnit: 'mg/L',
        testDate: new Date(),
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldTestAssignment = {
        id: testAssignmentId,
        result: null,
        oos: false,
        specification: {
          min: 100,
          max: 200,
        },
      };

      const updatedTestAssignment = {
        ...oldTestAssignment,
        result: dto.result,
        resultUnit: dto.resultUnit,
        testDate: dto.testDate,
        oos: false, // Within range
        status: TestAssignmentStatus.COMPLETED,
      };

      mockPrismaService.testAssignment.findUnique.mockResolvedValue(
        oldTestAssignment,
      );
      mockPrismaService.testAssignment.update.mockResolvedValue(
        updatedTestAssignment,
      );

      const result = await service.enterResult(testAssignmentId, dto, context);

      expect(result.result).toBe('150');
      expect(result.oos).toBe(false);
      expect(result.status).toBe(TestAssignmentStatus.COMPLETED);
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should flag OOS when result is out of range', async () => {
      const testAssignmentId = 'ta-123';
      const dto = {
        result: '250', // Above max
        resultUnit: 'mg/L',
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldTestAssignment = {
        id: testAssignmentId,
        result: null,
        oos: false,
        specification: {
          min: 100,
          max: 200,
        },
      };

      const updatedTestAssignment = {
        ...oldTestAssignment,
        result: dto.result,
        oos: true, // Out of range
        status: TestAssignmentStatus.COMPLETED,
      };

      mockPrismaService.testAssignment.findUnique.mockResolvedValue(
        oldTestAssignment,
      );
      mockPrismaService.testAssignment.update.mockResolvedValue(
        updatedTestAssignment,
      );

      const result = await service.enterResult(testAssignmentId, dto, context);

      expect(result.oos).toBe(true);
    });

    it('should not flag OOS when no specification is provided', async () => {
      const testAssignmentId = 'ta-123';
      const dto = {
        result: '9999',
      };

      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldTestAssignment = {
        id: testAssignmentId,
        result: null,
        oos: false,
        specification: null,
      };

      const updatedTestAssignment = {
        ...oldTestAssignment,
        result: dto.result,
        oos: false, // No spec = no OOS
        status: TestAssignmentStatus.COMPLETED,
      };

      mockPrismaService.testAssignment.findUnique.mockResolvedValue(
        oldTestAssignment,
      );
      mockPrismaService.testAssignment.update.mockResolvedValue(
        updatedTestAssignment,
      );

      const result = await service.enterResult(testAssignmentId, dto, context);

      expect(result.oos).toBe(false);
    });
  });

  describe('addTestPack', () => {
    it('should add multiple tests from a test pack', async () => {
      const sampleId = 'sample-123';
      const testPackId = 'pack-123';
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      mockPrismaService.sample.findUnique.mockResolvedValue({
        id: sampleId,
      });

      mockPrismaService.testPack.findUnique.mockResolvedValue({
        id: testPackId,
        name: 'Basic 6 Micro Tests',
        items: [
          {
            order: 1,
            testDefinition: {
              id: 'test-1',
              name: 'Test 1',
              sectionId: 'section-1',
              methodId: 'method-1',
              specificationId: 'spec-1',
              defaultDueDays: 5,
            },
          },
          {
            order: 2,
            testDefinition: {
              id: 'test-2',
              name: 'Test 2',
              sectionId: 'section-1',
              methodId: 'method-1',
              specificationId: 'spec-1',
              defaultDueDays: 5,
            },
          },
        ],
      });

      mockPrismaService.testAssignment.create.mockImplementation((args) => {
        return Promise.resolve({
          id: `ta-${Math.random()}`,
          ...args.data,
        });
      });

      const result = await service.addTestPack(sampleId, testPackId, context);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.testAssignment.create).toHaveBeenCalledTimes(2);
      expect(mockAuditService.logCreate).toHaveBeenCalledTimes(2);
      
      // All should have the same txId
      expect(mockAuditService.logCreate).toHaveBeenCalledWith(
        expect.objectContaining({ txId: 'tx-123' }),
        'TestAssignment',
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('listTestAssignments', () => {
    it('should filter by OOS flag', async () => {
      const mockTestAssignments = [
        { id: 'ta-1', oos: true },
        { id: 'ta-2', oos: true },
      ];

      mockPrismaService.testAssignment.findMany.mockResolvedValue(
        mockTestAssignments,
      );
      mockPrismaService.testAssignment.count.mockResolvedValue(2);

      const result = await service.listTestAssignments({
        oos: true,
        page: 1,
        perPage: 10,
      });

      expect(result.testAssignments).toEqual(mockTestAssignments);
      expect(mockPrismaService.testAssignment.findMany).toHaveBeenCalledWith({
        where: { oos: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });
});
