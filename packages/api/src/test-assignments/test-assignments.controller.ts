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
import { TestAssignmentsService } from './test-assignments.service';
import type {
  CreateTestAssignmentDto,
  UpdateTestAssignmentDto,
  EnterResultDto,
} from './test-assignments.service';
import { Roles } from '../auth/roles.decorator';
import { Role, TestAssignmentStatus } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('tests')
@ApiBearerAuth()
@Controller('tests')
export class TestAssignmentsController {
  constructor(private testAssignmentsService: TestAssignmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Create a new test assignment' })
  @ApiResponse({
    status: 201,
    description: 'Test assignment created successfully',
  })
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

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all test assignments' })
  @ApiResponse({
    status: 200,
    description: 'Test assignments retrieved successfully',
  })
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
  @ApiOperation({ summary: 'Get test assignment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Test assignment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
  async getTestAssignment(@Param('id') id: string) {
    return this.testAssignmentsService.getTestAssignment(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Update test assignment' })
  @ApiResponse({
    status: 200,
    description: 'Test assignment updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
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
  @ApiOperation({ summary: 'Enter result for test assignment' })
  @ApiResponse({ status: 200, description: 'Result entered successfully' })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
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
  @ApiOperation({ summary: 'Review test assignment' })
  @ApiResponse({
    status: 200,
    description: 'Test assignment reviewed successfully',
  })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
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
  @ApiOperation({ summary: 'Release test assignment' })
  @ApiResponse({
    status: 200,
    description: 'Test assignment released successfully',
  })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
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

  @Post(':id/attachments')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Add attachment to test assignment' })
  @ApiResponse({ status: 201, description: 'Attachment added successfully' })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
  async addAttachment(
    @Param('id') id: string,
    @Body()
    body: {
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      mimeType: string;
    },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testAssignmentsService.addAttachment(id, body, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete test assignment' })
  @ApiResponse({
    status: 200,
    description: 'Test assignment deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Test assignment not found' })
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
