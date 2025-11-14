import { Module } from '@nestjs/common';
import { TestPacksController } from './test-packs.controller';
import { TestPacksService } from './test-packs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestPacksController],
  providers: [TestPacksService],
  exports: [TestPacksService],
})
export class TestPacksModule {}
