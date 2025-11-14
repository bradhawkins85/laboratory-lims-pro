/**
 * Example Controller demonstrating RBAC usage
 * 
 * This file shows examples of how to use the permission system in your controllers.
 * Copy these patterns into your actual controller implementations.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermission, Action, Resource, can } from '../auth';
import { Role } from '@prisma/client';

// ============================================================================
// EXAMPLE 1: Basic route-level permission check
// ============================================================================

@Controller('samples')
export class SamplesControllerExample {
  constructor(private prisma: PrismaService) {}

  /**
   * Only users with CREATE permission on SAMPLE can access this route
   * Allowed roles: ADMIN, LAB_MANAGER, ANALYST
   */
  @Post()
  @RequirePermission(Action.CREATE, Resource.SAMPLE)
  async createSample(@Body() dto: CreateSampleDto, @Request() req) {
    const user = req.user;

    const sample = await this.prisma.sample.create({
      data: {
        sampleId: dto.sampleId,
        type: dto.type,
        userId: user.id,
        assignedUserId: dto.assignedUserId,
        clientId: dto.clientId,
        metadata: dto.metadata,
      },
    });

    return sample;
  }

  /**
   * Only ADMIN can delete samples
   */
  @Delete(':id')
  @RequirePermission(Action.DELETE, Resource.SAMPLE)
  async deleteSample(@Param('id') id: string) {
    await this.prisma.sample.delete({ where: { id } });
    return { message: 'Sample deleted successfully' };
  }
}

// ============================================================================
// EXAMPLE 2: Record-level permission check (with context)
// ============================================================================

@Controller('samples')
export class SamplesWithContextExample {
  constructor(private prisma: PrismaService) {}

  /**
   * Update a sample with record-level permission checking
   * 
   * The guard will:
   * 1. Fetch the sample from the database
   * 2. Check if user has UPDATE permission on SAMPLE
   * 3. Verify context: 
   *    - ANALYST: Can only update if assignedUserId matches user.id
   *    - CLIENT: Cannot update (no UPDATE permission)
   *    - ADMIN/LAB_MANAGER: Can update any sample
   */
  @Patch(':id')
  @RequirePermission(Action.UPDATE, Resource.SAMPLE, true) // true = check context
  async updateSample(@Param('id') id: string, @Body() dto: UpdateSampleDto) {
    const updated = await this.prisma.sample.update({
      where: { id },
      data: {
        type: dto.type,
        status: dto.status,
        metadata: dto.metadata,
      },
    });

    return updated;
  }

  /**
   * Get a single sample with record-level access control
   * 
   * The guard verifies:
   * - ANALYST: assignedUserId must match user.id
   * - CLIENT: clientId must match user.id
   * - Others: No restrictions
   */
  @Get(':id')
  @RequirePermission(Action.READ, Resource.SAMPLE, true) // true = check context
  async getSample(@Param('id') id: string) {
    const sample = await this.prisma.sample.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        tests: true,
      },
    });

    if (!sample) {
      throw new NotFoundException('Sample not found');
    }

    return sample;
  }
}

// ============================================================================
// EXAMPLE 3: Role-based filtering in list endpoints
// ============================================================================

@Controller('samples')
export class SamplesListExample {
  constructor(private prisma: PrismaService) {}

  /**
   * List samples with role-based filtering
   * 
   * Different roles see different data:
   * - ADMIN, LAB_MANAGER: See all samples
   * - ANALYST: See only assigned samples
   * - SALES_ACCOUNTING: See all samples (read-only)
   * - CLIENT: See only their own samples
   */
  @Get()
  @RequirePermission(Action.READ, Resource.SAMPLE)
  async listSamples(@Request() req) {
    const user = req.user;

    // Build query based on role
    const where: Record<string, unknown> = {};

    if (user.role === Role.ANALYST) {
      where.assignedUserId = user.id;
    } else if (user.role === Role.CLIENT) {
      where.clientId = user.id;
    }

    const samples = await this.prisma.sample.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    return samples;
  }
}

// ============================================================================
// EXAMPLE 4: Manual permission checking in business logic
// ============================================================================

@Controller('samples')
export class ManualPermissionCheckExample {
  constructor(private prisma: PrismaService) {}

  /**
   * Assign sample to an analyst
   * 
   * Demonstrates manual permission checking when you need more control
   */
  @Patch(':id/assign')
  async assignSample(
    @Param('id') id: string,
    @Body() dto: AssignSampleDto,
    @Request() req,
  ) {
    const user = req.user;

    // Manual permission check
    const permissionResult = can(user, Action.ASSIGN, Resource.TEST);

    if (!permissionResult.allowed) {
      throw new ForbiddenException(
        permissionResult.reason || 'Cannot assign samples',
      );
    }

    // Verify analyst exists and has ANALYST role
    const analyst = await this.prisma.user.findUnique({
      where: { id: dto.analystId },
    });

    if (!analyst || analyst.role !== Role.ANALYST) {
      throw new ForbiddenException('Invalid analyst');
    }

    const sample = await this.prisma.sample.update({
      where: { id },
      data: { assignedUserId: dto.analystId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return sample;
  }
}

// ============================================================================
// EXAMPLE 5: Reports with status-based access control
// ============================================================================

@Controller('reports')
export class ReportsExample {
  constructor(private prisma: PrismaService) {}

  /**
   * List reports - clients only see RELEASED reports
   */
  @Get()
  @RequirePermission(Action.READ, Resource.REPORT)
  async listReports(@Request() req) {
    const user = req.user;

    const where: Record<string, unknown> = {};

    // Clients can only see released reports
    if (user.role === Role.CLIENT) {
      where.status = 'RELEASED';
      // Also filter by client's samples
      where.test = {
        sample: {
          clientId: user.id,
        },
      };
    }

    const reports = await this.prisma.report.findMany({
      where,
      include: {
        test: {
          include: {
            sample: true,
          },
        },
      },
    });

    return reports;
  }

  /**
   * Generate draft report - only ANALYST can do this
   */
  @Post()
  @RequirePermission(Action.GENERATE_DRAFT, Resource.REPORT)
  async generateDraftReport(@Body() dto: CreateReportDto, @Request() req) {
    const user = req.user;

    const report = await this.prisma.report.create({
      data: {
        title: dto.title,
        status: 'DRAFT',
        version: 1,
        testId: dto.testId,
        userId: user.id,
        metadata: dto.metadata,
      },
    });

    return report;
  }

  /**
   * Finalize report - only LAB_MANAGER can do this
   */
  @Patch(':id/finalize')
  @RequirePermission(Action.FINALIZE, Resource.REPORT)
  async finalizeReport(@Param('id') id: string) {
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
    });

    return report;
  }

  /**
   * Release report - only LAB_MANAGER can do this
   */
  @Patch(':id/release')
  @RequirePermission(Action.RELEASE, Resource.REPORT)
  async releaseReport(@Param('id') id: string) {
    // Verify report is finalized before releasing
    const report = await this.prisma.report.findUnique({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'FINALIZED') {
      throw new ForbiddenException('Report must be finalized before release');
    }

    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    return updated;
  }
}

// ============================================================================
// EXAMPLE 6: Audit logs - read-only access
// ============================================================================

@Controller('audit-logs')
export class AuditLogsExample {
  constructor(private prisma: PrismaService) {}

  /**
   * List audit logs - only ADMIN and LAB_MANAGER can access
   */
  @Get()
  @RequirePermission(Action.READ, Resource.AUDIT_LOG)
  async listAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs;
  }

  /**
   * Get audit log by ID
   */
  @Get(':id')
  @RequirePermission(Action.READ, Resource.AUDIT_LOG)
  async getAuditLog(@Param('id') id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  // Note: There are NO endpoints for creating, updating, or deleting audit logs
  // Audit logs are created automatically by the system and are immutable
}

// ============================================================================
// EXAMPLE 7: Settings and templates - only ADMIN and LAB_MANAGER
// ============================================================================

@Controller('templates')
export class TemplatesExample {
  constructor(private prisma: PrismaService) {}

  /**
   * List templates - everyone with access can read
   */
  @Get()
  @RequirePermission(Action.READ, Resource.TEMPLATE)
  async listTemplates() {
    // ANALYST can read templates
    // Only ADMIN and LAB_MANAGER can manage them
    return { templates: [] };
  }

  /**
   * Create template - only ADMIN and LAB_MANAGER
   */
  @Post()
  @RequirePermission(Action.CREATE, Resource.TEMPLATE)
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return { template: dto };
  }

  /**
   * Update template - only ADMIN and LAB_MANAGER
   */
  @Patch(':id')
  @RequirePermission(Action.UPDATE, Resource.TEMPLATE)
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return { template: { id, ...dto } };
  }

  /**
   * Delete template - only ADMIN and LAB_MANAGER
   */
  @Delete(':id')
  @RequirePermission(Action.DELETE, Resource.TEMPLATE)
  async deleteTemplate(@Param('id') id: string) {
    return { message: 'Template deleted' };
  }
}

// ============================================================================
// DTOs (for reference)
// ============================================================================

class CreateSampleDto {
  sampleId: string;
  type: string;
  assignedUserId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

class UpdateSampleDto {
  type?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

class AssignSampleDto {
  analystId: string;
}

class CreateReportDto {
  title: string;
  testId: string;
  metadata?: Record<string, unknown>;
}

class CreateTemplateDto {
  name: string;
  content: string;
}

class UpdateTemplateDto {
  name?: string;
  content?: string;
}
