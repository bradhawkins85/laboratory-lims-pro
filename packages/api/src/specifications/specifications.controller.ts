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
import { SpecificationsService } from './specifications.service';
import type {
  CreateSpecificationDto,
  UpdateSpecificationDto,
} from './specifications.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('specifications')
@ApiBearerAuth()
@Controller('specifications')
export class SpecificationsController {
  constructor(private specificationsService: SpecificationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new specification' })
  @ApiResponse({
    status: 201,
    description: 'Specification created successfully',
  })
  async createSpecification(
    @Body() dto: CreateSpecificationDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.specificationsService.createSpecification(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all specifications' })
  @ApiResponse({
    status: 200,
    description: 'Specifications retrieved successfully',
  })
  async listSpecifications(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.specificationsService.listSpecifications({
      code,
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Get specification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Specification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async getSpecification(@Param('id') id: string) {
    return this.specificationsService.getSpecification(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update specification' })
  @ApiResponse({
    status: 200,
    description: 'Specification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async updateSpecification(
    @Param('id') id: string,
    @Body() dto: UpdateSpecificationDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.specificationsService.updateSpecification(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete specification' })
  @ApiResponse({
    status: 200,
    description: 'Specification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Specification not found' })
  async deleteSpecification(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.specificationsService.deleteSpecification(id, context);
  }
}
