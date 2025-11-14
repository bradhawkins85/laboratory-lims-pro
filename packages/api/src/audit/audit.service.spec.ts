import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logCreate', () => {
    it('should log a create action with full field set', async () => {
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
        ip: '127.0.0.1',
        userAgent: 'jest',
      };

      const newValues = {
        id: 'record-123',
        name: 'Test Record',
        status: 'active',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logCreate(context, 'TestTable', 'record-123', newValues);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'user-123',
          actorEmail: 'test@example.com',
          action: AuditAction.CREATE,
          table: 'TestTable',
          recordId: 'record-123',
          changes: expect.objectContaining({
            name: { old: null, new: 'Test Record' },
            status: { old: null, new: 'active' },
          }),
        }),
      });
    });
  });

  describe('logUpdate', () => {
    it('should log an update action with field-level diffs', async () => {
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldValues = {
        id: 'record-123',
        name: 'Old Name',
        status: 'active',
      };

      const newValues = {
        id: 'record-123',
        name: 'New Name',
        status: 'active',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logUpdate(
        context,
        'TestTable',
        'record-123',
        oldValues,
        newValues,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.UPDATE,
          changes: expect.objectContaining({
            name: { old: 'Old Name', new: 'New Name' },
          }),
        }),
      });

      // Should not include unchanged fields
      const changes = mockPrismaService.auditLog.create.mock.calls[0][0].data.changes;
      expect(changes).not.toHaveProperty('status');
    });

    it('should not log if there are no changes', async () => {
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const values = {
        id: 'record-123',
        name: 'Same Name',
        status: 'active',
      };

      await service.logUpdate(context, 'TestTable', 'record-123', values, values);

      expect(mockPrismaService.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('logDelete', () => {
    it('should log a delete action with old values', async () => {
      const context = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      const oldValues = {
        id: 'record-123',
        name: 'Deleted Record',
        status: 'active',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logDelete(context, 'TestTable', 'record-123', oldValues);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.DELETE,
          changes: expect.objectContaining({
            name: { old: 'Deleted Record', new: null },
            status: { old: 'active', new: null },
          }),
        }),
      });
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      const mockLogs = [
        { id: '1', action: AuditAction.CREATE, table: 'TestTable' },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.queryAuditLogs({
        table: 'TestTable',
        recordId: 'record-123',
        page: 1,
        perPage: 10,
      });

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        page: 1,
        perPage: 10,
        totalPages: 1,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          table: 'TestTable',
          recordId: 'record-123',
        },
        orderBy: { at: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('generateTxId', () => {
    it('should generate a unique transaction ID', () => {
      const txId1 = service.generateTxId();
      const txId2 = service.generateTxId();

      expect(txId1).toMatch(/^tx-\d+-[a-z0-9]+$/);
      expect(txId2).toMatch(/^tx-\d+-[a-z0-9]+$/);
      expect(txId1).not.toBe(txId2);
    });
  });
});
