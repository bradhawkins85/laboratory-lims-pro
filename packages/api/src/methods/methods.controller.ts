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
import { MethodsService } from './methods.service';
import type { CreateMethodDto, UpdateMethodDto } from './methods.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('methods')
@ApiBearerAuth()
@Controller('methods')
export class MethodsController {
  constructor(private methodsService: MethodsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Create a new method' })
  @ApiResponse({ status: 201, description: 'Method created successfully' })
  async createMethod(@Body() dto: CreateMethodDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.methodsService.createMethod(dto, context);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'List all methods' })
  @ApiResponse({ status: 200, description: 'Methods retrieved successfully' })
  async listMethods(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.methodsService.listMethods({
      code,
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Get method by ID' })
  @ApiResponse({ status: 200, description: 'Method retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Method not found' })
  async getMethod(@Param('id') id: string) {
    return this.methodsService.getMethod(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update method' })
  @ApiResponse({ status: 200, description: 'Method updated successfully' })
  @ApiResponse({ status: 404, description: 'Method not found' })
  async updateMethod(
    @Param('id') id: string,
    @Body() dto: UpdateMethodDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.methodsService.updateMethod(id, dto, context);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Delete method' })
  @ApiResponse({ status: 200, description: 'Method deleted successfully' })
  @ApiResponse({ status: 404, description: 'Method not found' })
  async deleteMethod(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.methodsService.deleteMethod(id, context);
  }
}
