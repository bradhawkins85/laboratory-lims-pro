import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface RoleInfo {
  value: Role;
  label: string;
  description: string;
}

@Injectable()
export class RolesService {
  private roles: RoleInfo[] = [
    {
      value: Role.ADMIN,
      label: 'Admin',
      description:
        'Full access, manage users/roles, system settings',
    },
    {
      value: Role.LAB_MANAGER,
      label: 'Lab Manager',
      description:
        'QA/Reviewer - approve/release results & COAs, view all, edit Samples/Tests, manage templates',
    },
    {
      value: Role.ANALYST,
      label: 'Analyst',
      description:
        'Create/edit Samples & assigned Tests, enter results, upload attachments, request re-tests',
    },
    {
      value: Role.SALES_ACCOUNTING,
      label: 'Sales & Accounting',
      description:
        'Read Samples, read accounting fields, create/update quotes/PO/SO, set invoice flags',
    },
    {
      value: Role.CLIENT,
      label: 'Client',
      description:
        'Portal view of their Samples, results, and final COAs only (read-only)',
    },
  ];

  async listRoles() {
    return {
      data: this.roles,
      total: this.roles.length,
    };
  }

  async getRole(role: Role) {
    const roleInfo = this.roles.find((r) => r.value === role);
    if (!roleInfo) {
      throw new Error(`Role ${role} not found`);
    }
    return roleInfo;
  }
}
