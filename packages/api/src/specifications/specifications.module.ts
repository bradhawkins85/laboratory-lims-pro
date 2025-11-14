import { Module } from '@nestjs/common';
import { SpecificationsController } from './specifications.controller';
import { SpecificationsService } from './specifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecificationsController],
  providers: [SpecificationsService],
  exports: [SpecificationsService],
})
export class SpecificationsModule {}
