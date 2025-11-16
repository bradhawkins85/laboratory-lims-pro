/**
 * Client-side RBAC (Role-Based Access Control) Helpers
 * 
 * These utilities help hide/disable controls based on user roles
 * on the frontend. Note: Always enforce permissions on the backend!
 */

export type Role =
  | 'ADMIN'
  | 'LAB_MANAGER'
  | 'ANALYST'
  | 'SALES_ACCOUNTING'
  | 'CLIENT';

export type Action =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'RELEASE'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'EDIT_RESULTS'
  | 'GENERATE_DRAFT'
  | 'FINALIZE'
  | 'VIEW_VERSIONS'
  | 'MANAGE';

export type Resource =
  | 'SAMPLE'
  | 'TEST'
  | 'REPORT'
  | 'AUDIT_LOG'
  | 'SETTINGS'
  | 'TEMPLATE'
  | 'TEST_PACK'
  | 'USER'
  | 'ROLE'
  | 'ATTACHMENT'
  | 'ACCOUNTING'
  | 'QUOTE'
  | 'PURCHASE_ORDER'
  | 'SALES_ORDER'
  | 'INVOICE';

interface User {
  id: string;
  role: Role;
  email?: string;
}

/**
 * Check if a user has permission to perform an action on a resource
 * 
 * @param user - The current user
 * @param action - The action to perform
 * @param resource - The resource to act on
 * @returns true if the user has permission, false otherwise
 * 
 * @example
 * const user = getCurrentUser();
 * if (can(user, 'UPDATE', 'SAMPLE')) {
 *   // Show edit button
 * }
 */
export function can(user: User | null, action: Action, resource: Resource): boolean {
  if (!user) return false;

  const role = user.role;

  // ADMIN has all permissions
  if (role === 'ADMIN') {
    return true;
  }

  // LAB_MANAGER permissions
  if (role === 'LAB_MANAGER') {
    // Can do everything except manage users/roles
    if (resource === 'USER' || resource === 'ROLE') {
      return action === 'READ';
    }
    return true;
  }

  // ANALYST permissions
  if (role === 'ANALYST') {
    switch (resource) {
      case 'SAMPLE':
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      case 'TEST':
        return ['CREATE', 'READ', 'UPDATE', 'EDIT_RESULTS'].includes(action);
      case 'ATTACHMENT':
        return ['CREATE', 'READ'].includes(action);
      case 'REPORT':
        return action === 'READ';
      case 'AUDIT_LOG':
        return action === 'READ';
      default:
        return false;
    }
  }

  // SALES_ACCOUNTING permissions
  if (role === 'SALES_ACCOUNTING') {
    switch (resource) {
      case 'SAMPLE':
        return action === 'READ';
      case 'ACCOUNTING':
      case 'QUOTE':
      case 'PURCHASE_ORDER':
      case 'SALES_ORDER':
      case 'INVOICE':
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      default:
        return false;
    }
  }

  // CLIENT permissions
  if (role === 'CLIENT') {
    switch (resource) {
      case 'SAMPLE':
      case 'TEST':
      case 'REPORT':
        return action === 'READ';
      default:
        return false;
    }
  }

  return false;
}

/**
 * Get the current user from localStorage
 * 
 * @returns The current user or null if not authenticated
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;

    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

/**
 * Check if the current user can perform an action on a resource
 * 
 * @param action - The action to perform
 * @param resource - The resource to act on
 * @returns true if the current user has permission, false otherwise
 * 
 * @example
 * if (canCurrentUser('UPDATE', 'SAMPLE')) {
 *   // Show edit button
 * }
 */
export function canCurrentUser(action: Action, resource: Resource): boolean {
  const user = getCurrentUser();
  return can(user, action, resource);
}

/**
 * Check if the current user has any of the specified roles
 * 
 * @param roles - Array of roles to check
 * @returns true if the user has any of the roles, false otherwise
 * 
 * @example
 * if (hasRole(['ADMIN', 'LAB_MANAGER'])) {
 *   // Show admin controls
 * }
 */
export function hasRole(roles: Role[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;

  return roles.includes(user.role);
}

/**
 * Check if the current user is authenticated
 * 
 * @returns true if the user is authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');

  return !!(token && user);
}

/**
 * Get CSS classes for conditionally hiding elements based on permissions
 * 
 * @param action - The action to check
 * @param resource - The resource to check
 * @returns 'hidden' if the user doesn't have permission, empty string otherwise
 * 
 * @example
 * <button className={hideIf('DELETE', 'SAMPLE')}>
 *   Delete
 * </button>
 */
export function hideIf(action: Action, resource: Resource): string {
  return canCurrentUser(action, resource) ? '' : 'hidden';
}

/**
 * Get attributes for conditionally disabling elements based on permissions
 * 
 * @param action - The action to check
 * @param resource - The resource to check
 * @returns Object with disabled property
 * 
 * @example
 * <button {...disableIf('UPDATE', 'SAMPLE')}>
 *   Edit
 * </button>
 */
export function disableIf(action: Action, resource: Resource): { disabled?: boolean } {
  return {
    disabled: !canCurrentUser(action, resource),
  };
}

/**
 * Role descriptions for display
 */
export const RoleDescriptions: Record<Role, string> = {
  ADMIN: 'Full access, manage users/roles, system settings',
  LAB_MANAGER:
    'QA/Reviewer - approve/release results & COAs, view all, edit Samples/Tests, manage templates',
  ANALYST:
    'Create/edit Samples & assigned Tests, enter results, upload attachments, request re-tests',
  SALES_ACCOUNTING:
    'Read Samples, read accounting fields, create/update quotes/PO/SO, set invoice flags',
  CLIENT: 'Portal view of their Samples, results, and final COAs only (read-only)',
};
