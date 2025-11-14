import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../auth/roles.decorator';
import { Role, AuditAction } from '@prisma/client';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@Roles(Role.ADMIN, Role.LAB_MANAGER)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get audit logs with filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  async getAuditLogs(
    @Query('table') table?: string,
    @Query('recordId') recordId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('txId') txId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('groupByTxId') groupByTxId?: string,
  ) {
    return this.auditService.queryAuditLogs({
      table,
      recordId,
      actorId,
      action,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      txId,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
      groupByTxId: groupByTxId === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLog(@Param('id') id: string) {
    return this.auditService.getAuditLog(id);
  }
}
