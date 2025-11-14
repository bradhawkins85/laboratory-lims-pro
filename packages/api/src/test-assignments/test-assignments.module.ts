import { Module } from '@nestjs/common';
import { TestAssignmentsService } from './test-assignments.service';
import { TestAssignmentsController } from './test-assignments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [TestAssignmentsService],
  controllers: [TestAssignmentsController],
  exports: [TestAssignmentsService],
})
export class TestAssignmentsModule {}
