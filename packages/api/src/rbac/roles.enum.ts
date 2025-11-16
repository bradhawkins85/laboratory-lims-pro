/**
 * RBAC Roles Enum
 * Re-exports Role enum from Prisma client for consistency
 */
export { Role } from '@prisma/client';

/**
 * Role descriptions for documentation
 */
export const RoleDescriptions: Record<string, string> = {
  ADMIN: 'Full access, manage users/roles, system settings',
  LAB_MANAGER:
    'QA/Reviewer - approve/release results & COAs, view all, edit Samples/Tests, manage templates',
  ANALYST:
    'Create/edit Samples & assigned Tests, enter results, upload attachments, request re-tests',
  SALES_ACCOUNTING:
    'Read Samples, read accounting fields, create/update quotes/PO/SO, set invoice flags',
  CLIENT: 'Portal view of their Samples, results, and final COAs only (read-only)',
};
