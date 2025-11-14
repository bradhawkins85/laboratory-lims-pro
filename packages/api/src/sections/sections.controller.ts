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
import { SectionsService } from './sections.service';
import type { CreateSectionDto, UpdateSectionDto } from './sections.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('sections')
@ApiBearerAuth()
@Controller('sections')
export class SectionsController {
  constructor(private sectionsService: SectionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new section' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  async createSection(@Body() dto: CreateSectionDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.sectionsService.createSection(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all sections' })
  @ApiResponse({ status: 200, description: 'Sections retrieved successfully' })
  async listSections(
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.sectionsService.listSections({
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Get section by ID' })
  @ApiResponse({ status: 200, description: 'Section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async getSection(@Param('id') id: string) {
    return this.sectionsService.getSection(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async updateSection(
    @Param('id') id: string,
    @Body() dto: UpdateSectionDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.sectionsService.updateSection(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete section' })
  @ApiResponse({ status: 200, description: 'Section deleted successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async deleteSection(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.sectionsService.deleteSection(id, context);
  }
}
