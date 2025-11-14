import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditContextMiddleware } from './audit-context.middleware';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, AuditContextMiddleware],
  controllers: [AuditController],
  exports: [AuditService, AuditContextMiddleware],
})
export class AuditModule {}
