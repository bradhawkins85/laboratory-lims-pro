import { Role } from '@prisma/client';
import {
  can,
  canAny,
  canAll,
  getAllowedActions,
  hasRole,
  hasAnyRole,
  isAdmin,
  canApprove,
  canManageTemplates,
  canViewAuditLogs,
} from './permissions.helper';
import {
  Action,
  Resource,
  PermissionUser,
  PermissionContext,
} from './permissions.types';

describe('Permissions Helper', () => {
  // Test users
  const admin: PermissionUser = { id: 'admin-1', role: Role.ADMIN };
  const labManager: PermissionUser = {
    id: 'manager-1',
    role: Role.LAB_MANAGER,
  };
  const analyst: PermissionUser = { id: 'analyst-1', role: Role.ANALYST };
  const salesAccounting: PermissionUser = {
    id: 'sales-1',
    role: Role.SALES_ACCOUNTING,
  };
  const client: PermissionUser = { id: 'client-1', role: Role.CLIENT };

  describe('can() - Basic role permissions', () => {
    it('should allow ADMIN to perform any action on any resource', () => {
      expect(can(admin, Action.CREATE, Resource.SAMPLE).allowed).toBe(true);
      expect(can(admin, Action.DELETE, Resource.TEST).allowed).toBe(true);
      expect(can(admin, Action.MANAGE, Resource.USER).allowed).toBe(true);
    });

    it('should allow LAB_MANAGER to approve and release', () => {
      expect(can(labManager, Action.APPROVE, Resource.TEST).allowed).toBe(true);
      expect(can(labManager, Action.RELEASE, Resource.TEST).allowed).toBe(true);
      expect(can(labManager, Action.FINALIZE, Resource.REPORT).allowed).toBe(
        true,
      );
    });

    it('should not allow LAB_MANAGER to delete samples', () => {
      expect(can(labManager, Action.DELETE, Resource.SAMPLE).allowed).toBe(
        false,
      );
    });

    it('should allow ANALYST to create and edit samples', () => {
      expect(can(analyst, Action.CREATE, Resource.SAMPLE).allowed).toBe(true);
      expect(can(analyst, Action.UPDATE, Resource.SAMPLE).allowed).toBe(true);
      expect(can(analyst, Action.EDIT_RESULTS, Resource.TEST).allowed).toBe(
        true,
      );
    });

    it('should not allow ANALYST to approve or release', () => {
      expect(can(analyst, Action.APPROVE, Resource.TEST).allowed).toBe(false);
      expect(can(analyst, Action.RELEASE, Resource.TEST).allowed).toBe(false);
      expect(can(analyst, Action.FINALIZE, Resource.REPORT).allowed).toBe(
        false,
      );
    });

    it('should allow SALES_ACCOUNTING to manage accounting resources', () => {
      expect(can(salesAccounting, Action.READ, Resource.SAMPLE).allowed).toBe(
        true,
      );
      expect(
        can(salesAccounting, Action.UPDATE, Resource.ACCOUNTING).allowed,
      ).toBe(true);
      expect(can(salesAccounting, Action.CREATE, Resource.QUOTE).allowed).toBe(
        true,
      );
      expect(
        can(salesAccounting, Action.UPDATE, Resource.INVOICE).allowed,
      ).toBe(true);
    });

    it('should not allow SALES_ACCOUNTING to modify samples', () => {
      expect(can(salesAccounting, Action.UPDATE, Resource.SAMPLE).allowed).toBe(
        false,
      );
      expect(can(salesAccounting, Action.DELETE, Resource.SAMPLE).allowed).toBe(
        false,
      );
    });

    it('should allow CLIENT to read but not modify', () => {
      expect(can(client, Action.READ, Resource.SAMPLE).allowed).toBe(true);
      expect(can(client, Action.READ, Resource.REPORT).allowed).toBe(true);
      expect(can(client, Action.UPDATE, Resource.SAMPLE).allowed).toBe(false);
      expect(can(client, Action.CREATE, Resource.TEST).allowed).toBe(false);
    });

    it('should not allow CLIENT to access audit logs', () => {
      expect(can(client, Action.READ, Resource.AUDIT_LOG).allowed).toBe(false);
    });
  });

  describe('can() - Context-based permissions', () => {
    it('should allow ANALYST to access assigned samples', () => {
      const context: PermissionContext = {
        assignedUserId: 'analyst-1',
      };
      expect(
        can(analyst, Action.UPDATE, Resource.SAMPLE, context).allowed,
      ).toBe(true);
    });

    it('should not allow ANALYST to access non-assigned samples', () => {
      const context: PermissionContext = {
        assignedUserId: 'other-analyst',
      };
      expect(
        can(analyst, Action.UPDATE, Resource.SAMPLE, context).allowed,
      ).toBe(false);
    });

    it('should allow CLIENT to access their own samples', () => {
      const context: PermissionContext = {
        clientId: 'client-1',
      };
      expect(can(client, Action.READ, Resource.SAMPLE, context).allowed).toBe(
        true,
      );
    });

    it('should not allow CLIENT to access other clients samples', () => {
      const context: PermissionContext = {
        clientId: 'other-client',
      };
      expect(can(client, Action.READ, Resource.SAMPLE, context).allowed).toBe(
        false,
      );
    });

    it('should allow CLIENT to view only released reports', () => {
      const context: PermissionContext = {
        clientId: 'client-1',
        status: 'RELEASED',
      };
      expect(can(client, Action.READ, Resource.REPORT, context).allowed).toBe(
        true,
      );
    });

    it('should not allow CLIENT to view draft reports', () => {
      const context: PermissionContext = {
        clientId: 'client-1',
        status: 'DRAFT',
      };
      expect(can(client, Action.READ, Resource.REPORT, context).allowed).toBe(
        false,
      );
    });

    it('should not allow SALES_ACCOUNTING to modify finalized accounting fields', () => {
      const context: PermissionContext = {
        status: 'FINALIZED',
      };
      expect(
        can(salesAccounting, Action.UPDATE, Resource.ACCOUNTING, context)
          .allowed,
      ).toBe(false);
    });
  });

  describe('canAny()', () => {
    it('should return true if user can perform any of the actions', () => {
      const result = canAny(
        analyst,
        [Action.CREATE, Action.DELETE],
        Resource.SAMPLE,
      );
      expect(result.allowed).toBe(true); // Can CREATE but not DELETE
    });

    it('should return false if user cannot perform any of the actions', () => {
      const result = canAny(
        client,
        [Action.CREATE, Action.UPDATE, Action.DELETE],
        Resource.SAMPLE,
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('canAll()', () => {
    it('should return true if user can perform all actions', () => {
      const result = canAll(
        admin,
        [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
        Resource.SAMPLE,
      );
      expect(result.allowed).toBe(true);
    });

    it('should return false if user cannot perform all actions', () => {
      const result = canAll(
        analyst,
        [Action.CREATE, Action.READ, Action.DELETE],
        Resource.SAMPLE,
      );
      expect(result.allowed).toBe(false); // Cannot DELETE
    });
  });

  describe('getAllowedActions()', () => {
    it('should return all allowed actions for ADMIN on samples', () => {
      const actions = getAllowedActions(admin, Resource.SAMPLE);
      expect(actions).toContain(Action.CREATE);
      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.UPDATE);
      expect(actions).toContain(Action.DELETE);
    });

    it('should return limited actions for ANALYST on samples', () => {
      const actions = getAllowedActions(analyst, Resource.SAMPLE);
      expect(actions).toContain(Action.CREATE);
      expect(actions).toContain(Action.READ);
      expect(actions).toContain(Action.UPDATE);
      expect(actions).not.toContain(Action.DELETE);
    });

    it('should return only read for CLIENT on samples', () => {
      const actions = getAllowedActions(client, Resource.SAMPLE);
      expect(actions).toEqual([Action.READ]);
    });

    it('should return empty array for CLIENT on audit logs', () => {
      const actions = getAllowedActions(client, Resource.AUDIT_LOG);
      expect(actions).toEqual([]);
    });
  });

  describe('Role helper functions', () => {
    it('hasRole() should check exact role', () => {
      expect(hasRole(admin, Role.ADMIN)).toBe(true);
      expect(hasRole(admin, Role.LAB_MANAGER)).toBe(false);
    });

    it('hasAnyRole() should check if user has any of the roles', () => {
      expect(hasAnyRole(labManager, [Role.ADMIN, Role.LAB_MANAGER])).toBe(true);
      expect(hasAnyRole(analyst, [Role.ADMIN, Role.LAB_MANAGER])).toBe(false);
    });

    it('isAdmin() should identify admins', () => {
      expect(isAdmin(admin)).toBe(true);
      expect(isAdmin(labManager)).toBe(false);
    });

    it('canApprove() should identify users who can approve', () => {
      expect(canApprove(admin)).toBe(true);
      expect(canApprove(labManager)).toBe(true);
      expect(canApprove(analyst)).toBe(false);
    });

    it('canManageTemplates() should identify users who can manage templates', () => {
      expect(canManageTemplates(admin)).toBe(true);
      expect(canManageTemplates(labManager)).toBe(true);
      expect(canManageTemplates(analyst)).toBe(false);
    });

    it('canViewAuditLogs() should identify users who can view audit logs', () => {
      expect(canViewAuditLogs(admin)).toBe(true);
      expect(canViewAuditLogs(labManager)).toBe(true);
      expect(canViewAuditLogs(analyst)).toBe(false);
      expect(canViewAuditLogs(client)).toBe(false);
    });
  });

  describe('Audit Log permissions', () => {
    it('should allow only ADMIN and LAB_MANAGER to read audit logs', () => {
      expect(can(admin, Action.READ, Resource.AUDIT_LOG).allowed).toBe(true);
      expect(can(labManager, Action.READ, Resource.AUDIT_LOG).allowed).toBe(
        true,
      );
      expect(can(analyst, Action.READ, Resource.AUDIT_LOG).allowed).toBe(false);
      expect(
        can(salesAccounting, Action.READ, Resource.AUDIT_LOG).allowed,
      ).toBe(false);
      expect(can(client, Action.READ, Resource.AUDIT_LOG).allowed).toBe(false);
    });

    it('should not allow anyone to modify audit logs', () => {
      expect(can(admin, Action.UPDATE, Resource.AUDIT_LOG).allowed).toBe(false);
      expect(can(admin, Action.DELETE, Resource.AUDIT_LOG).allowed).toBe(false);
    });
  });

  describe('Template and Test Pack permissions', () => {
    it('should allow ADMIN and LAB_MANAGER to manage templates', () => {
      expect(can(admin, Action.MANAGE, Resource.TEMPLATE).allowed).toBe(true);
      expect(can(labManager, Action.MANAGE, Resource.TEMPLATE).allowed).toBe(
        true,
      );
      expect(can(analyst, Action.MANAGE, Resource.TEMPLATE).allowed).toBe(
        false,
      );
    });

    it('should allow ANALYST to read templates', () => {
      expect(can(analyst, Action.READ, Resource.TEMPLATE).allowed).toBe(true);
      expect(can(analyst, Action.READ, Resource.TEST_PACK).allowed).toBe(true);
    });
  });
});
