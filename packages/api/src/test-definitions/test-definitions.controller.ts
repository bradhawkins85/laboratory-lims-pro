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
import { TestDefinitionsService } from './test-definitions.service';
import type {
  CreateTestDefinitionDto,
  UpdateTestDefinitionDto,
} from './test-definitions.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('test-definitions')
@ApiBearerAuth()
@Controller('test-definitions')
export class TestDefinitionsController {
  constructor(private testDefinitionsService: TestDefinitionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new test definition' })
  @ApiResponse({
    status: 201,
    description: 'Test definition created successfully',
  })
  async createTestDefinition(
    @Body() dto: CreateTestDefinitionDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testDefinitionsService.createTestDefinition(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all test definitions' })
  @ApiResponse({
    status: 200,
    description: 'Test definitions retrieved successfully',
  })
  async listTestDefinitions(
    @Query('name') name?: string,
    @Query('sectionId') sectionId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.testDefinitionsService.listTestDefinitions({
      name,
      sectionId,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Get test definition by ID' })
  @ApiResponse({
    status: 200,
    description: 'Test definition retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Test definition not found' })
  async getTestDefinition(@Param('id') id: string) {
    return this.testDefinitionsService.getTestDefinition(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update test definition' })
  @ApiResponse({
    status: 200,
    description: 'Test definition updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Test definition not found' })
  async updateTestDefinition(
    @Param('id') id: string,
    @Body() dto: UpdateTestDefinitionDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testDefinitionsService.updateTestDefinition(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete test definition' })
  @ApiResponse({
    status: 200,
    description: 'Test definition deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Test definition not found' })
  async deleteTestDefinition(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testDefinitionsService.deleteTestDefinition(id, context);
  }
}
