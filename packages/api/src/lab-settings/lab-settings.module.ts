import { Module } from '@nestjs/common';
import { LabSettingsService } from './lab-settings.service';
import { LabSettingsController } from './lab-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LabSettingsController],
  providers: [LabSettingsService],
  exports: [LabSettingsService],
})
export class LabSettingsModule {}
