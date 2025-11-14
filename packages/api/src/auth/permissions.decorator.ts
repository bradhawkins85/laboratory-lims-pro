import { SetMetadata } from '@nestjs/common';
import { Action, Resource } from './permissions.types';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  action: Action;
  resource: Resource;
  checkContext?: boolean; // Whether to check record-level permissions
}

/**
 * Decorator to require specific permissions for a route
 * @param action - The action being performed
 * @param resource - The resource being accessed
 * @param checkContext - Whether to check record-level permissions (default: false)
 *
 * @example
 * @RequirePermission(Action.CREATE, Resource.SAMPLE)
 * async createSample() { ... }
 *
 * @example
 * @RequirePermission(Action.UPDATE, Resource.SAMPLE, true)
 * async updateSample(@Param('id') id: string) { ... }
 */
export const RequirePermission = (
  action: Action,
  resource: Resource,
  checkContext = false,
) =>
  SetMetadata(PERMISSION_KEY, {
    action,
    resource,
    checkContext,
  } as PermissionMetadata);
