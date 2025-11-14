import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/roles.decorator';
import { Role, AuditAction } from '@prisma/client';

@Controller('audit')
@Roles(Role.ADMIN, Role.LAB_MANAGER)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
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
    });
  }
}
