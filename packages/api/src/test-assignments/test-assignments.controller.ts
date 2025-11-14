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
import { TestAssignmentsService } from './test-assignments.service';
import type {
  CreateTestAssignmentDto,
  UpdateTestAssignmentDto,
  EnterResultDto,
} from './test-assignments.service';
import { Roles } from '../auth/roles.decorator';
import { Role, TestAssignmentStatus } from '@prisma/client';
import type { Request } from 'express';

@Controller('test-assignments')
export class TestAssignmentsController {
  constructor(private testAssignmentsService: TestAssignmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async createTestAssignment(
    @Body() dto: CreateTestAssignmentDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.createTestAssignment(dto, context);
  }

  @Post('add-test-pack')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async addTestPack(
    @Body() body: { sampleId: string; testPackId: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.addTestPack(
      body.sampleId,
      body.testPackId,
      context,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async listTestAssignments(
    @Query('sampleId') sampleId?: string,
    @Query('analystId') analystId?: string,
    @Query('status') status?: TestAssignmentStatus,
    @Query('oos') oos?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.testAssignmentsService.listTestAssignments({
      sampleId,
      analystId,
      status,
      oos: oos === 'true',
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async getTestAssignment(@Param('id') id: string) {
    return this.testAssignmentsService.getTestAssignment(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async updateTestAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateTestAssignmentDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.updateTestAssignment(id, dto, context);
  }

  @Post(':id/enter-result')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  async enterResult(
    @Param('id') id: string,
    @Body() dto: EnterResultDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.enterResult(id, dto, context);
  }

  @Post(':id/review')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async reviewTestAssignment(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.reviewTestAssignment(id, context);
  }

  @Post(':id/release')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async releaseTestAssignment(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.releaseTestAssignment(id, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  async deleteTestAssignment(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.deleteTestAssignment(id, context);
  }
}
