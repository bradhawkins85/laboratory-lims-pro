import { Role } from '@prisma/client';
import { can as authCan } from '../auth/permissions.helper';
import {
  Action,
  Resource,
  PermissionContext,
  PermissionUser,
} from '../auth/permissions.types';

/**
 * RBAC can() helper function
 * Checks if a user can perform an action on a resource given the context
 * 
 * This is a re-export of the permissions helper with RBAC terminology
 * 
 * @param user - The user requesting access
 * @param action - The action to perform
 * @param resource - The resource to act on
 * @param context - Additional context for record-level permissions
 * @returns Object with allowed boolean and optional reason
 * 
 * @example
 * const result = can(user, Action.UPDATE, Resource.SAMPLE, { status: 'DRAFT' });
 * if (result.allowed) {
 *   // Perform action
 * } else {
 *   console.log(result.reason);
 * }
 */
export function can(
  user: PermissionUser,
  action: Action,
  resource: Resource,
  context?: PermissionContext,
) {
  return authCan(user, action, resource, context);
}

// Re-export types for convenience
export type { Action, Resource, PermissionContext, PermissionUser };
export { Role };
