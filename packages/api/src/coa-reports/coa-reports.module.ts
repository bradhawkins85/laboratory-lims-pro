import { Module } from '@nestjs/common';
import { COAReportsService } from './coa-reports.service';
import { COAReportsController } from './coa-reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';
import { LabSettingsModule } from '../lab-settings/lab-settings.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PdfModule,
    StorageModule,
    LabSettingsModule,
  ],
  providers: [COAReportsService],
  controllers: [COAReportsController],
  exports: [COAReportsService],
})
export class COAReportsModule {}
