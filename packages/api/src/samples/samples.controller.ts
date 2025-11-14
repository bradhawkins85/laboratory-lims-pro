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
import { SamplesService } from './samples.service';
import type { CreateSampleDto, UpdateSampleDto } from './samples.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('samples')
export class SamplesController {
  constructor(private samplesService: SamplesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async createSample(@Body() dto: CreateSampleDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.samplesService.createSample(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async listSamples(
    @Query('jobId') jobId?: string,
    @Query('clientId') clientId?: string,
    @Query('released') released?: string,
    @Query('urgent') urgent?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.samplesService.listSamples({
      jobId,
      clientId,
      released: released === 'true',
      urgent: urgent === 'true',
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getSample(@Param('id') id: string) {
    return this.samplesService.getSample(id);
  }

  @Get('by-code/:sampleCode')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST, Role.SALES_ACCOUNTING)
  async getSampleByCode(@Param('sampleCode') sampleCode: string) {
    return this.samplesService.getSampleByCode(sampleCode);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async updateSample(
    @Param('id') id: string,
    @Body() dto: UpdateSampleDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.samplesService.updateSample(id, dto, context);
  }

  @Post(':id/release')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async releaseSample(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.samplesService.releaseSample(id, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async deleteSample(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.samplesService.deleteSample(id, context);
  }
}
