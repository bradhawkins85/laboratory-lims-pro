import { Module } from '@nestjs/common';
import { TestDefinitionsController } from './test-definitions.controller';
import { TestDefinitionsService } from './test-definitions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestDefinitionsController],
  providers: [TestDefinitionsService],
  exports: [TestDefinitionsService],
})
export class TestDefinitionsModule {}
