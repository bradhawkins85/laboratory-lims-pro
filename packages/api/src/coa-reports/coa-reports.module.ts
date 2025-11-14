import { Module } from '@nestjs/common';
import { COAReportsService } from './coa-reports.service';
import { COAReportsController } from './coa-reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [COAReportsService],
  controllers: [COAReportsController],
  exports: [COAReportsService],
})
export class COAReportsModule {}
