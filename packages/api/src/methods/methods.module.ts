import { Module } from '@nestjs/common';
import { MethodsController } from './methods.controller';
import { MethodsService } from './methods.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MethodsController],
  providers: [MethodsService],
  exports: [MethodsService],
})
export class MethodsModule {}
