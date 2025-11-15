import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LabSettingsService } from './lab-settings.service';
import type { UpdateLabSettingsDto } from './lab-settings.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('lab-settings')
export class LabSettingsController {
  constructor(private labSettingsService: LabSettingsService) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.LAB_MANAGER,
    Role.ANALYST,
    Role.SALES_ACCOUNTING,
    Role.CLIENT,
  )
  @ApiOperation({ summary: 'Get lab settings' })
  @ApiResponse({
    status: 200,
    description: 'Lab settings retrieved successfully',
  })
  async getSettings() {
    return this.labSettingsService.getSettings();
  }

  @Put()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Update lab settings' })
  @ApiResponse({
    status: 200,
    description: 'Lab settings updated successfully',
  })
  async updateSettings(@Body() dto: UpdateLabSettingsDto, @Req() req: Request) {
    const user = (req as any).user;
    const context = {
      actorId: user.userId,
      actorEmail: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.labSettingsService.updateSettings(dto, context);
  }
}
