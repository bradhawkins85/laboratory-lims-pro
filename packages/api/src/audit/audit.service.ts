import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ip?: string;
  userAgent?: string;
  txId?: string;
}

interface AuditLogFilters {
  table?: string;
  recordId?: string;
  actorId?: string;
  action?: AuditAction;
  fromDate?: Date;
  toDate?: Date;
  txId?: string;
  page?: number;
  perPage?: number;
  groupByTxId?: boolean;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit entry for a create operation
   */
  async logCreate(
    context: AuditContext,
    table: string,
    recordId: string,
    newValues: Record<string, any>,
    reason?: string,
  ): Promise<void> {
    const changes = this.buildChangesForCreate(newValues);

    await this.prisma.auditLog.create({
      data: {
        actorId: context.actorId,
        actorEmail: context.actorEmail,
        ip: context.ip,
        userAgent: context.userAgent,
        action: AuditAction.CREATE,
        table,
        recordId,
        changes,
        reason,
        txId: context.txId,
      },
    });
  }

  /**
   * Log an audit entry for an update operation
   */
  async logUpdate(
    context: AuditContext,
    table: string,
    recordId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    reason?: string,
  ): Promise<void> {
    const changes = this.buildChangesForUpdate(oldValues, newValues);

    // Only log if there are actual changes
    if (Object.keys(changes).length === 0) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: context.actorId,
        actorEmail: context.actorEmail,
        ip: context.ip,
        userAgent: context.userAgent,
        action: AuditAction.UPDATE,
        table,
        recordId,
        changes,
        reason,
        txId: context.txId,
      },
    });
  }

  /**
   * Log an audit entry for a delete operation
   */
  async logDelete(
    context: AuditContext,
    table: string,
    recordId: string,
    oldValues: Record<string, any>,
    reason?: string,
  ): Promise<void> {
    const changes = this.buildChangesForDelete(oldValues);

    await this.prisma.auditLog.create({
      data: {
        actorId: context.actorId,
        actorEmail: context.actorEmail,
        ip: context.ip,
        userAgent: context.userAgent,
        action: AuditAction.DELETE,
        table,
        recordId,
        changes,
        reason,
        txId: context.txId,
      },
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters: AuditLogFilters) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.table) where.table = filters.table;
    if (filters.recordId) where.recordId = filters.recordId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.txId) where.txId = filters.txId;

    if (filters.fromDate || filters.toDate) {
      where.at = {};
      if (filters.fromDate) where.at.gte = filters.fromDate;
      if (filters.toDate) where.at.lte = filters.toDate;
    }

    const page = filters.page || 1;
    const perPage = filters.perPage || 50;
    const skip = (page - 1) * perPage;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { at: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Group by txId if requested
    if (filters.groupByTxId) {
      const grouped = this.groupLogsByTxId(logs);
      return {
        logs: grouped,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        grouped: true,
      };
    }

    return {
      logs,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      grouped: false,
    };
  }

  /**
   * Get a single audit log by ID
   */
  async getAuditLog(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new Error(`Audit log with ID '${id}' not found`);
    }

    return log;
  }

  /**
   * Generate a transaction ID for grouping related changes
   */
  generateTxId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Build changes object for CREATE action
   * Each field shows null -> newValue
   */
  private buildChangesForCreate(
    newValues: Record<string, any>,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const [key, value] of Object.entries(newValues)) {
      // Skip system fields that are auto-generated
      if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

      changes[key] = {
        old: null,
        new: this.serializeValue(value),
      };
    }

    return changes;
  }

  /**
   * Build changes object for UPDATE action
   * Only includes fields that actually changed
   */
  private buildChangesForUpdate(
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const [key, newValue] of Object.entries(newValues)) {
      // Skip system fields that are auto-updated
      if (['updatedAt'].includes(key)) continue;

      const oldValue = oldValues[key];

      // Check if value actually changed
      if (this.hasValueChanged(oldValue, newValue)) {
        changes[key] = {
          old: this.serializeValue(oldValue),
          new: this.serializeValue(newValue),
        };
      }
    }

    return changes;
  }

  /**
   * Build changes object for DELETE action
   * Each field shows oldValue -> null
   */
  private buildChangesForDelete(
    oldValues: Record<string, any>,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const [key, value] of Object.entries(oldValues)) {
      // Skip system fields
      if (['createdAt', 'updatedAt'].includes(key)) continue;

      changes[key] = {
        old: this.serializeValue(value),
        new: null,
      };
    }

    return changes;
  }

  /**
   * Check if a value has changed
   */
  private hasValueChanged(oldValue: any, newValue: any): boolean {
    // Handle null/undefined
    if (oldValue === null && newValue === null) return false;
    if (oldValue === undefined && newValue === undefined) return false;
    if (
      (oldValue === null || oldValue === undefined) &&
      newValue !== null &&
      newValue !== undefined
    )
      return true;
    if (
      (newValue === null || newValue === undefined) &&
      oldValue !== null &&
      oldValue !== undefined
    )
      return true;

    // Handle dates
    if (oldValue instanceof Date && newValue instanceof Date) {
      return oldValue.getTime() !== newValue.getTime();
    }

    // Handle objects (deep comparison for simple objects)
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }

    // Simple value comparison
    return oldValue !== newValue;
  }

  /**
   * Serialize a value for storage in audit log
   */
  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.parse(JSON.stringify(value));
    }

    return value;
  }

  /**
   * Group audit logs by transaction ID
   * Groups related changes that happened in the same transaction
   */
  private groupLogsByTxId(logs: AuditLog[]) {
    const grouped = new Map<
      string,
      {
        txId: string;
        timestamp: Date;
        actorId: string;
        actorEmail: string;
        ip: string | null;
        userAgent: string | null;
        logs: Array<{
          id: string;
          action: AuditAction;
          table: string;
          recordId: string;
          changes: unknown;
          reason: string | null;
        }>;
      }
    >();

    for (const log of logs) {
      const txId = log.txId || log.id; // Fall back to log id if no txId

      if (!grouped.has(txId)) {
        grouped.set(txId, {
          txId,
          timestamp: log.at,
          actorId: log.actorId,
          actorEmail: log.actorEmail,
          ip: log.ip,
          userAgent: log.userAgent,
          logs: [],
        });
      }

      const group = grouped.get(txId);
      if (group) {
        group.logs.push({
          id: log.id,
          action: log.action,
          table: log.table,
          recordId: log.recordId,
          changes: log.changes,
          reason: log.reason,
        });
      }
    }

    // Convert map to array and sort by timestamp
    return Array.from(grouped.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }
}
