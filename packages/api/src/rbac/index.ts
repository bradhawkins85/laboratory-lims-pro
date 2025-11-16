/**
 * RBAC Module - Centralized exports for Role-Based Access Control
 * 
 * This module provides a clean API for RBAC functionality:
 * - Role enum and descriptions
 * - PoliciesGuard for protecting routes
 * - can() helper for programmatic permission checks
 * - Action and Resource enums
 * - Permission types
 */

export * from './roles.enum';
export * from './policies.guard';
export * from './can.helper';
