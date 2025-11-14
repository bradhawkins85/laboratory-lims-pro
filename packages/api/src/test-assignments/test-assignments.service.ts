import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditContext } from '../audit/audit.service';
import { TestAssignment, TestAssignmentStatus } from '@prisma/client';

export interface CreateTestAssignmentDto {
  sampleId: string;
  testDefinitionId?: string;
  sectionId: string;
  methodId: string;
  specificationId?: string;
  customTestName?: string;
  dueDate?: Date;
  analystId?: string;
  status?: TestAssignmentStatus;
}

export interface UpdateTestAssignmentDto {
  customTestName?: string;
  dueDate?: Date;
  analystId?: string;
  status?: TestAssignmentStatus;
  testDate?: Date;
  result?: string;
  resultUnit?: string;
  oos?: boolean;
  comments?: string;
  invoiceNote?: string;
  precision?: string;
  linearity?: string;
  chkById?: string;
  chkDate?: Date;
}

export interface EnterResultDto {
  result: string;
  resultUnit?: string;
  testDate?: Date;
}

@Injectable()
export class TestAssignmentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Create a single test assignment
   * AC: Adding/removing/altering any TestAssignment writes granular audit log entries
   */
  async createTestAssignment(
    dto: CreateTestAssignmentDto,
    context: AuditContext,
  ): Promise<TestAssignment> {
    // Verify that sample exists
    const sample = await this.prisma.sample.findUnique({ where: { id: dto.sampleId } });
    if (!sample) {
      throw new NotFoundException(`Sample with ID '${dto.sampleId}' not found`);
    }

    // Calculate due date if not provided
    let dueDate = dto.dueDate;
    if (!dueDate && dto.testDefinitionId) {
      const testDef = await this.prisma.testDefinition.findUnique({
        where: { id: dto.testDefinitionId },
      });
      if (testDef?.defaultDueDays) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + testDef.defaultDueDays);
      }
    }

    // Create the test assignment
    const testAssignment = await this.prisma.testAssignment.create({
      data: {
        sampleId: dto.sampleId,
        testDefinitionId: dto.testDefinitionId,
        sectionId: dto.sectionId,
        methodId: dto.methodId,
        specificationId: dto.specificationId,
        customTestName: dto.customTestName,
        dueDate,
        analystId: dto.analystId,
        status: dto.status || TestAssignmentStatus.DRAFT,
        createdById: context.actorId,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry with full field set
    await this.auditService.logCreate(
      context,
      'TestAssignment',
      testAssignment.id,
      testAssignment,
    );

    return testAssignment;
  }

  /**
   * Add tests from a TestPack
   * AC: Adding whole TestPacks creates multiple TestAssignments with audit logging
   */
  async addTestPack(
    sampleId: string,
    testPackId: string,
    context: AuditContext,
  ): Promise<TestAssignment[]> {
    // Verify sample exists
    const sample = await this.prisma.sample.findUnique({ where: { id: sampleId } });
    if (!sample) {
      throw new NotFoundException(`Sample with ID '${sampleId}' not found`);
    }

    // Get test pack with all its items
    const testPack = await this.prisma.testPack.findUnique({
      where: { id: testPackId },
      include: {
        items: {
          include: {
            testDefinition: {
              include: {
                section: true,
                method: true,
                specification: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!testPack) {
      throw new NotFoundException(`TestPack with ID '${testPackId}' not found`);
    }

    // Create a transaction ID to group these changes
    const txId = this.auditService.generateTxId();
    const contextWithTxId = { ...context, txId };

    // Create test assignments for each item in the pack
    const testAssignments: TestAssignment[] = [];
    
    for (const item of testPack.items) {
      const testDef = item.testDefinition;
      
      // Calculate due date
      let dueDate: Date | undefined;
      if (testDef.defaultDueDays) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + testDef.defaultDueDays);
      }

      const testAssignment = await this.prisma.testAssignment.create({
        data: {
          sampleId,
          testDefinitionId: testDef.id,
          sectionId: testDef.sectionId,
          methodId: testDef.methodId,
          specificationId: testDef.specificationId,
          dueDate,
          status: TestAssignmentStatus.DRAFT,
          createdById: context.actorId,
          updatedById: context.actorId,
        },
        include: {
          sample: true,
          section: true,
          method: true,
          specification: true,
          testDefinition: true,
          analyst: { select: { id: true, email: true, name: true } },
          checker: { select: { id: true, email: true, name: true } },
        },
      });

      testAssignments.push(testAssignment);

      // Log audit entry for each test assignment
      await this.auditService.logCreate(
        contextWithTxId,
        'TestAssignment',
        testAssignment.id,
        testAssignment,
      );
    }

    return testAssignments;
  }

  /**
   * Enter result and compute OOS flag
   * AC: System computes OOS using Specification comparator
   */
  async enterResult(
    id: string,
    dto: EnterResultDto,
    context: AuditContext,
  ): Promise<TestAssignment> {
    const oldTestAssignment = await this.prisma.testAssignment.findUnique({
      where: { id },
      include: { specification: true },
    });

    if (!oldTestAssignment) {
      throw new NotFoundException(`TestAssignment with ID '${id}' not found`);
    }

    // Compute OOS flag based on specification
    const oos = this.computeOOS(dto.result, oldTestAssignment.specification);

    // Update the test assignment
    const testAssignment = await this.prisma.testAssignment.update({
      where: { id },
      data: {
        result: dto.result,
        resultUnit: dto.resultUnit,
        testDate: dto.testDate || new Date(),
        oos,
        status: TestAssignmentStatus.COMPLETED,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry with field-level diffs
    await this.auditService.logUpdate(
      context,
      'TestAssignment',
      testAssignment.id,
      oldTestAssignment,
      testAssignment,
    );

    return testAssignment;
  }

  /**
   * Review a test assignment (Lab Manager only)
   * AC: Only Lab Manager (or Admin) can review/release
   */
  async reviewTestAssignment(
    id: string,
    context: AuditContext,
  ): Promise<TestAssignment> {
    const oldTestAssignment = await this.prisma.testAssignment.findUnique({
      where: { id },
    });

    if (!oldTestAssignment) {
      throw new NotFoundException(`TestAssignment with ID '${id}' not found`);
    }

    if (oldTestAssignment.status !== TestAssignmentStatus.COMPLETED) {
      throw new BadRequestException(
        'TestAssignment must be COMPLETED before it can be reviewed',
      );
    }

    const testAssignment = await this.prisma.testAssignment.update({
      where: { id },
      data: {
        status: TestAssignmentStatus.REVIEWED,
        chkById: context.actorId,
        chkDate: new Date(),
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for review action
    await this.auditService.logUpdate(
      context,
      'TestAssignment',
      testAssignment.id,
      oldTestAssignment,
      testAssignment,
    );

    return testAssignment;
  }

  /**
   * Release a test assignment (Lab Manager only)
   */
  async releaseTestAssignment(
    id: string,
    context: AuditContext,
  ): Promise<TestAssignment> {
    const oldTestAssignment = await this.prisma.testAssignment.findUnique({
      where: { id },
    });

    if (!oldTestAssignment) {
      throw new NotFoundException(`TestAssignment with ID '${id}' not found`);
    }

    if (oldTestAssignment.status !== TestAssignmentStatus.REVIEWED) {
      throw new BadRequestException(
        'TestAssignment must be REVIEWED before it can be released',
      );
    }

    const testAssignment = await this.prisma.testAssignment.update({
      where: { id },
      data: {
        status: TestAssignmentStatus.RELEASED,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry for release action
    await this.auditService.logUpdate(
      context,
      'TestAssignment',
      testAssignment.id,
      oldTestAssignment,
      testAssignment,
    );

    return testAssignment;
  }

  /**
   * Get a test assignment by ID
   */
  async getTestAssignment(id: string): Promise<TestAssignment | null> {
    return this.prisma.testAssignment.findUnique({
      where: { id },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
        attachments: true,
      },
    });
  }

  /**
   * List test assignments with filters
   * AC: OOS auto-flags are searchable and filterable
   */
  async listTestAssignments(filters?: {
    sampleId?: string;
    analystId?: string;
    status?: TestAssignmentStatus;
    oos?: boolean;
    page?: number;
    perPage?: number;
  }) {
    const where: any = {};
    if (filters?.sampleId) where.sampleId = filters.sampleId;
    if (filters?.analystId) where.analystId = filters.analystId;
    if (filters?.status) where.status = filters.status;
    if (filters?.oos !== undefined) where.oos = filters.oos;

    const page = filters?.page || 1;
    const perPage = filters?.perPage || 50;
    const skip = (page - 1) * perPage;

    const [testAssignments, total] = await Promise.all([
      this.prisma.testAssignment.findMany({
        where,
        include: {
          sample: { select: { id: true, sampleCode: true } },
          section: true,
          method: true,
          specification: true,
          testDefinition: true,
          analyst: { select: { id: true, email: true, name: true } },
          checker: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.testAssignment.count({ where }),
    ]);

    return {
      testAssignments,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Update a test assignment
   */
  async updateTestAssignment(
    id: string,
    dto: UpdateTestAssignmentDto,
    context: AuditContext,
  ): Promise<TestAssignment> {
    const oldTestAssignment = await this.prisma.testAssignment.findUnique({
      where: { id },
    });

    if (!oldTestAssignment) {
      throw new NotFoundException(`TestAssignment with ID '${id}' not found`);
    }

    const testAssignment = await this.prisma.testAssignment.update({
      where: { id },
      data: {
        ...dto,
        updatedById: context.actorId,
      },
      include: {
        sample: true,
        section: true,
        method: true,
        specification: true,
        testDefinition: true,
        analyst: { select: { id: true, email: true, name: true } },
        checker: { select: { id: true, email: true, name: true } },
      },
    });

    // Log audit entry with field-level diffs
    await this.auditService.logUpdate(
      context,
      'TestAssignment',
      testAssignment.id,
      oldTestAssignment,
      testAssignment,
    );

    return testAssignment;
  }

  /**
   * Delete a test assignment
   */
  async deleteTestAssignment(id: string, context: AuditContext): Promise<void> {
    const oldTestAssignment = await this.prisma.testAssignment.findUnique({
      where: { id },
    });

    if (!oldTestAssignment) {
      throw new NotFoundException(`TestAssignment with ID '${id}' not found`);
    }

    await this.prisma.testAssignment.delete({
      where: { id },
    });

    // Log audit entry for deletion
    await this.auditService.logDelete(
      context,
      'TestAssignment',
      id,
      oldTestAssignment,
    );
  }

  /**
   * Compute OOS (Out of Specification) flag based on specification rules
   * Supports: >=, <=, in range, equals, etc.
   */
  private computeOOS(result: string, specification: any): boolean {
    if (!specification) {
      return false; // No specification means no OOS
    }

    // Try to parse result as a number
    const numericResult = parseFloat(result);
    if (isNaN(numericResult)) {
      // If result is not numeric, check for exact match with target
      if (specification.target) {
        return result.trim().toLowerCase() !== specification.target.trim().toLowerCase();
      }
      return false;
    }

    // Check min/max range
    if (specification.min !== null && specification.min !== undefined) {
      if (numericResult < specification.min) {
        return true; // OOS: below minimum
      }
    }

    if (specification.max !== null && specification.max !== undefined) {
      if (numericResult > specification.max) {
        return true; // OOS: above maximum
      }
    }

    // Check oosRule if specified
    if (specification.oosRule) {
      const rule = specification.oosRule.toLowerCase();
      
      if (rule.includes('>=')) {
        const threshold = parseFloat(rule.split('>=')[1]);
        return numericResult < threshold;
      }
      
      if (rule.includes('<=')) {
        const threshold = parseFloat(rule.split('<=')[1]);
        return numericResult > threshold;
      }
      
      if (rule.includes('=') || rule.includes('equals')) {
        const target = parseFloat(rule.match(/[\d.]+/)?.[0] || '0');
        return numericResult !== target;
      }
    }

    return false; // In specification
  }
}
