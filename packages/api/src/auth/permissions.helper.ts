import { Role } from '@prisma/client';
import {
  Action,
  Resource,
  PermissionContext,
  PermissionResult,
  PermissionUser,
} from './permissions.types';

/**
 * Permission Matrix for Laboratory LIMS Pro
 *
 * Roles:
 * - ADMIN: Full access to everything
 * - LAB_MANAGER: QA/Reviewer - approve/release results & COAs, view all, edit Samples/Tests, manage templates
 * - ANALYST: Create/edit Samples & assigned Tests, enter results, upload attachments, request re-tests
 * - SALES_ACCOUNTING: Read Samples, read accounting fields, create/update quotes/PO/SO, set invoice flags
 * - CLIENT: Portal view of their Samples, results, and final COAs only (read-only)
 */

// Define the permission matrix
const PERMISSION_MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  [Role.ADMIN]: {
    // Admin has full access to everything
    [Resource.SAMPLE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.TEST]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.ASSIGN,
      Action.UNASSIGN,
      Action.EDIT_RESULTS,
      Action.APPROVE,
      Action.RELEASE,
    ],
    [Resource.REPORT]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.GENERATE_DRAFT,
      Action.FINALIZE,
      Action.RELEASE,
      Action.VIEW_VERSIONS,
    ],
    [Resource.AUDIT_LOG]: [Action.READ],
    [Resource.SETTINGS]: [Action.READ, Action.UPDATE, Action.MANAGE],
    [Resource.TEMPLATE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.TEST_PACK]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.USER]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.ROLE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.ATTACHMENT]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.ACCOUNTING]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.QUOTE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.PURCHASE_ORDER]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.SALES_ORDER]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
    [Resource.INVOICE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
    ],
  },
  [Role.LAB_MANAGER]: {
    [Resource.SAMPLE]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.TEST]: [
      Action.READ,
      Action.UPDATE,
      Action.ASSIGN,
      Action.UNASSIGN,
      Action.EDIT_RESULTS,
      Action.APPROVE,
      Action.RELEASE,
    ],
    [Resource.REPORT]: [
      Action.READ,
      Action.FINALIZE,
      Action.RELEASE,
      Action.VIEW_VERSIONS,
    ],
    [Resource.AUDIT_LOG]: [Action.READ],
    [Resource.SETTINGS]: [Action.READ, Action.UPDATE, Action.MANAGE],
    [Resource.TEMPLATE]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.TEST_PACK]: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.MANAGE,
    ],
    [Resource.USER]: [Action.READ],
    [Resource.ATTACHMENT]: [Action.CREATE, Action.READ],
    [Resource.ACCOUNTING]: [Action.READ],
    [Resource.QUOTE]: [Action.READ],
    [Resource.PURCHASE_ORDER]: [Action.READ],
    [Resource.SALES_ORDER]: [Action.READ],
    [Resource.INVOICE]: [Action.READ],
  },
  [Role.ANALYST]: {
    [Resource.SAMPLE]: [Action.CREATE, Action.READ, Action.UPDATE], // Only for assigned samples (context-based)
    [Resource.TEST]: [Action.READ, Action.UPDATE, Action.EDIT_RESULTS], // Only for assigned tests
    [Resource.REPORT]: [
      Action.GENERATE_DRAFT,
      Action.READ,
      Action.VIEW_VERSIONS,
    ],
    [Resource.ATTACHMENT]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.TEMPLATE]: [Action.READ],
    [Resource.TEST_PACK]: [Action.READ],
  },
  [Role.SALES_ACCOUNTING]: {
    [Resource.SAMPLE]: [Action.READ],
    [Resource.TEST]: [Action.READ],
    [Resource.REPORT]: [Action.READ],
    [Resource.ACCOUNTING]: [Action.READ, Action.UPDATE],
    [Resource.QUOTE]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.PURCHASE_ORDER]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.SALES_ORDER]: [Action.CREATE, Action.READ, Action.UPDATE],
    [Resource.INVOICE]: [Action.READ, Action.UPDATE],
  },
  [Role.CLIENT]: {
    // Clients can only view their own samples and released reports (context-based)
    [Resource.SAMPLE]: [Action.READ],
    [Resource.TEST]: [Action.READ],
    [Resource.REPORT]: [Action.READ], // Only released reports
  },
};

/**
 * Core permission checking function
 * @param user - User object with id and role
 * @param action - Action being attempted
 * @param resource - Resource type being accessed
 * @param context - Optional context for record-level checks
 * @returns PermissionResult with allowed status and optional reason
 */
export function can(
  user: PermissionUser,
  action: Action,
  resource: Resource,
  context?: PermissionContext,
): PermissionResult {
  // Check if user has the role-level permission
  const rolePermissions = PERMISSION_MATRIX[user.role];

  if (!rolePermissions) {
    return {
      allowed: false,
      reason: `Invalid role: ${user.role}`,
    };
  }

  const resourcePermissions = rolePermissions[resource];

  if (!resourcePermissions || !resourcePermissions.includes(action)) {
    return {
      allowed: false,
      reason: `Role ${user.role} does not have permission to ${action} ${resource}`,
    };
  }

  // Record-level permission checks based on context
  if (context) {
    // ANALYST: Can only access assigned samples and tests
    if (user.role === Role.ANALYST) {
      if (resource === Resource.SAMPLE || resource === Resource.TEST) {
        if (context.assignedUserId && context.assignedUserId !== user.id) {
          return {
            allowed: false,
            reason: 'Analyst can only access assigned samples/tests',
          };
        }
      }
    }

    // CLIENT: Can only view their own samples and released reports
    if (user.role === Role.CLIENT) {
      if (resource === Resource.SAMPLE || resource === Resource.TEST) {
        if (context.clientId && context.clientId !== user.id) {
          return {
            allowed: false,
            reason: 'Client can only access their own samples',
          };
        }
      }

      if (resource === Resource.REPORT) {
        // Clients can only view released reports
        if (context.status !== 'RELEASED') {
          return {
            allowed: false,
            reason: 'Client can only view released reports',
          };
        }

        // Must be their sample
        if (context.clientId && context.clientId !== user.id) {
          return {
            allowed: false,
            reason: 'Client can only view their own reports',
          };
        }
      }
    }

    // SALES_ACCOUNTING: Cannot modify finalized/released items
    if (user.role === Role.SALES_ACCOUNTING) {
      if (resource === Resource.ACCOUNTING && action !== Action.READ) {
        if (context.status === 'FINALIZED' || context.status === 'RELEASED') {
          return {
            allowed: false,
            reason:
              'Cannot modify accounting fields on finalized/released items',
          };
        }
      }
    }
  }

  return {
    allowed: true,
  };
}

/**
 * Helper to check if user can perform ANY of the given actions
 */
export function canAny(
  user: PermissionUser,
  actions: Action[],
  resource: Resource,
  context?: PermissionContext,
): PermissionResult {
  for (const action of actions) {
    const result = can(user, action, resource, context);
    if (result.allowed) {
      return result;
    }
  }

  return {
    allowed: false,
    reason: `Role ${user.role} does not have any of the required permissions for ${resource}`,
  };
}

/**
 * Helper to check if user can perform ALL of the given actions
 */
export function canAll(
  user: PermissionUser,
  actions: Action[],
  resource: Resource,
  context?: PermissionContext,
): PermissionResult {
  for (const action of actions) {
    const result = can(user, action, resource, context);
    if (!result.allowed) {
      return result;
    }
  }

  return {
    allowed: true,
  };
}

/**
 * Get all actions allowed for a user on a resource
 */
export function getAllowedActions(
  user: PermissionUser,
  resource: Resource,
  context?: PermissionContext,
): Action[] {
  const rolePermissions = PERMISSION_MATRIX[user.role];

  if (!rolePermissions) {
    return [];
  }

  const resourcePermissions = rolePermissions[resource];

  if (!resourcePermissions) {
    return [];
  }

  // Filter actions based on context if provided
  return resourcePermissions.filter((action) => {
    const result = can(user, action, resource, context);
    return result.allowed;
  });
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: PermissionUser, role: Role): boolean {
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: PermissionUser, roles: Role[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: PermissionUser): boolean {
  return user.role === Role.ADMIN;
}

/**
 * Check if user is a Lab Manager or Admin (for approval/release actions)
 */
export function canApprove(user: PermissionUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.LAB_MANAGER;
}

/**
 * Check if user can manage templates and test packs
 */
export function canManageTemplates(user: PermissionUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.LAB_MANAGER;
}

/**
 * Check if user can access audit logs
 */
export function canViewAuditLogs(user: PermissionUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.LAB_MANAGER;
}
