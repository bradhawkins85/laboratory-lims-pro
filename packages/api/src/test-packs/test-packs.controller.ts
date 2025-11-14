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
import { TestPacksService } from './test-packs.service';
import type {
  CreateTestPackDto,
  UpdateTestPackDto,
} from './test-packs.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('test-packs')
@ApiBearerAuth()
@Controller('test-packs')
export class TestPacksController {
  constructor(private testPacksService: TestPacksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new test pack' })
  @ApiResponse({ status: 201, description: 'Test pack created successfully' })
  async createTestPack(@Body() dto: CreateTestPackDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testPacksService.createTestPack(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all test packs' })
  @ApiResponse({
    status: 200,
    description: 'Test packs retrieved successfully',
  })
  async listTestPacks(
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.testPacksService.listTestPacks({
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Get test pack by ID' })
  @ApiResponse({
    status: 200,
    description: 'Test pack retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Test pack not found' })
  async getTestPack(@Param('id') id: string) {
    return this.testPacksService.getTestPack(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update test pack' })
  @ApiResponse({ status: 200, description: 'Test pack updated successfully' })
  @ApiResponse({ status: 404, description: 'Test pack not found' })
  async updateTestPack(
    @Param('id') id: string,
    @Body() dto: UpdateTestPackDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testPacksService.updateTestPack(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete test pack' })
  @ApiResponse({ status: 200, description: 'Test pack deleted successfully' })
  @ApiResponse({ status: 404, description: 'Test pack not found' })
  async deleteTestPack(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.testPacksService.deleteTestPack(id, context);
  }
}
