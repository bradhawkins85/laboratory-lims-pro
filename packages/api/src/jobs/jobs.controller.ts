import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import type { CreateJobDto, UpdateJobDto } from './jobs.service';
import { Roles } from '../auth/roles.decorator';
import { Role, JobStatus } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async createJob(@Body() dto: CreateJobDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.jobsService.createJob(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async listJobs(
    @Query('clientId') clientId?: string,
    @Query('status') status?: JobStatus,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.jobsService.listJobs({
      clientId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }

  @Get('by-number/:jobNumber')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getJobByNumber(@Param('jobNumber') jobNumber: string) {
    return this.jobsService.getJobByNumber(jobNumber);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async updateJob(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.jobsService.updateJob(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async deleteJob(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.jobsService.deleteJob(id, context);
  }

  @Post(':id/samples')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async createSampleForJob(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.jobsService.createSampleForJob(id, dto, context);
  }
}
