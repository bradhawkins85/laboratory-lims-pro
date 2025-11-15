import { Module } from '@nestjs/common';
import { COAReportsService } from './coa-reports.service';
import { COAReportsController } from './coa-reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, AuditModule, PdfModule, StorageModule],
  providers: [COAReportsService],
  controllers: [COAReportsController],
  exports: [COAReportsService],
})
export class COAReportsModule {}
