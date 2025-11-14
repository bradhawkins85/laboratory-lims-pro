import { Role } from '@prisma/client';

// Permission actions
export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  RELEASE = 'RELEASE',
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
  EDIT_RESULTS = 'EDIT_RESULTS',
  GENERATE_DRAFT = 'GENERATE_DRAFT',
  FINALIZE = 'FINALIZE',
  VIEW_VERSIONS = 'VIEW_VERSIONS',
  MANAGE = 'MANAGE',
}

// Resource types
export enum Resource {
  SAMPLE = 'SAMPLE',
  TEST = 'TEST',
  REPORT = 'REPORT',
  AUDIT_LOG = 'AUDIT_LOG',
  SETTINGS = 'SETTINGS',
  TEMPLATE = 'TEMPLATE',
  TEST_PACK = 'TEST_PACK',
  USER = 'USER',
  ROLE = 'ROLE',
  ATTACHMENT = 'ATTACHMENT',
  ACCOUNTING = 'ACCOUNTING', // For accounting fields in samples
  QUOTE = 'QUOTE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  SALES_ORDER = 'SALES_ORDER',
  INVOICE = 'INVOICE',
}

// Context for record-level permissions
export interface PermissionContext {
  userId?: string;
  assignedUserId?: string;
  clientId?: string;
  status?: string;
  ownerId?: string;
  [key: string]: any;
}

// Permission check result
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

// User interface for permission checking
export interface PermissionUser {
  id: string;
  role: Role;
  email?: string;
}
