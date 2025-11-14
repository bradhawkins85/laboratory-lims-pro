import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Get all available roles with descriptions' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async listRoles() {
    return this.rolesService.listRoles();
  }

  @Get(':role')
  @Roles(Role.ADMIN, Role.LAB_MANAGER)
  @ApiOperation({ summary: 'Get information about a specific role' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async getRole(@Param('role') role: Role) {
    return this.rolesService.getRole(role);
  }
}
