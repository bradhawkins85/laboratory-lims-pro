import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from './audit/audit.module';
import { JobsModule } from './jobs/jobs.module';
import { SamplesModule } from './samples/samples.module';
import { TestAssignmentsModule } from './test-assignments/test-assignments.module';
import { COAReportsModule } from './coa-reports/coa-reports.module';
import { ClientsModule } from './clients/clients.module';
import { MethodsModule } from './methods/methods.module';
import { SpecificationsModule } from './specifications/specifications.module';
import { SectionsModule } from './sections/sections.module';
import { TestDefinitionsModule } from './test-definitions/test-definitions.module';
import { TestPacksModule } from './test-packs/test-packs.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    loggerConfig,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AuditModule,
    JobsModule,
    SamplesModule,
    TestAssignmentsModule,
    COAReportsModule,
    ClientsModule,
    MethodsModule,
    SpecificationsModule,
    SectionsModule,
    TestDefinitionsModule,
    TestPacksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
