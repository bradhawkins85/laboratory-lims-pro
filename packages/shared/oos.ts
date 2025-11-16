/**
 * Shared OOS (Out of Specification) Rule Evaluation Utilities
 * 
 * This module provides utilities for evaluating whether a test result
 * is Out of Specification (OOS) based on specification rules.
 */

export interface SpecificationRule {
  min?: number | null;
  max?: number | null;
  target?: string | null;
  oosRule?: string | null;
}

/**
 * Compute OOS (Out of Specification) flag based on specification rules
 * 
 * Supports:
 * - Numeric ranges (min/max)
 * - Exact target matching
 * - Custom OOS rules (>=, <=, equals)
 * 
 * @param result - The test result value
 * @param specification - The specification rules to check against
 * @returns true if result is out of specification, false otherwise
 * 
 * @example
 * // Numeric range check
 * computeOOS('5.5', { min: 1, max: 10 }) // returns false (in spec)
 * computeOOS('15', { min: 1, max: 10 }) // returns true (OOS - above max)
 * 
 * @example
 * // Target matching
 * computeOOS('Pass', { target: 'Pass' }) // returns false (matches)
 * computeOOS('Fail', { target: 'Pass' }) // returns true (OOS - doesn't match)
 * 
 * @example
 * // Custom OOS rule
 * computeOOS('8', { oosRule: '>= 5' }) // returns false (meets requirement)
 * computeOOS('3', { oosRule: '>= 5' }) // returns true (OOS - below threshold)
 */
export function computeOOS(
  result: string,
  specification?: SpecificationRule | null,
): boolean {
  if (!specification) {
    return false; // No specification means no OOS
  }

  // Try to parse result as a number
  const numericResult = parseFloat(result);
  if (isNaN(numericResult)) {
    // If result is not numeric, check for exact match with target
    if (specification.target) {
      return (
        result.trim().toLowerCase() !==
        specification.target.trim().toLowerCase()
      );
    }
    return false;
  }

  // Check min/max range
  if (specification.min !== null && specification.min !== undefined) {
    if (numericResult < specification.min) {
      return true; // OOS: below minimum
    }
  }

  if (specification.max !== null && specification.max !== undefined) {
    if (numericResult > specification.max) {
      return true; // OOS: above maximum
    }
  }

  // Check oosRule if specified
  if (specification.oosRule) {
    const rule = specification.oosRule.toLowerCase();

    if (rule.includes('>=')) {
      const threshold = parseFloat(rule.split('>=')[1]);
      return numericResult < threshold;
    }

    if (rule.includes('<=')) {
      const threshold = parseFloat(rule.split('<=')[1]);
      return numericResult > threshold;
    }

    if (rule.includes('=') || rule.includes('equals')) {
      const target = parseFloat(rule.match(/[\d.]+/)?.[0] || '0');
      return numericResult !== target;
    }
  }

  return false; // In specification
}

/**
 * Get a human-readable OOS status message
 * 
 * @param result - The test result value
 * @param specification - The specification rules to check against
 * @returns A string describing the OOS status
 * 
 * @example
 * getOOSMessage('15', { min: 1, max: 10 })
 * // returns "Out of Specification: Result 15 exceeds maximum 10"
 */
export function getOOSMessage(
  result: string,
  specification?: SpecificationRule | null,
): string {
  if (!specification) {
    return 'In Specification (No specification defined)';
  }

  const isOOS = computeOOS(result, specification);
  if (!isOOS) {
    return 'In Specification';
  }

  const numericResult = parseFloat(result);
  if (!isNaN(numericResult)) {
    if (
      specification.min !== null &&
      specification.min !== undefined &&
      numericResult < specification.min
    ) {
      return `Out of Specification: Result ${numericResult} is below minimum ${specification.min}`;
    }

    if (
      specification.max !== null &&
      specification.max !== undefined &&
      numericResult > specification.max
    ) {
      return `Out of Specification: Result ${numericResult} exceeds maximum ${specification.max}`;
    }
  }

  if (specification.target) {
    return `Out of Specification: Result "${result}" does not match target "${specification.target}"`;
  }

  return 'Out of Specification';
}

/**
 * Check if a specification has rules defined
 * 
 * @param specification - The specification to check
 * @returns true if the specification has any rules defined
 */
export function hasSpecificationRules(
  specification?: SpecificationRule | null,
): boolean {
  if (!specification) return false;

  return !!(
    specification.min !== null && specification.min !== undefined ||
    specification.max !== null && specification.max !== undefined ||
    specification.target ||
    specification.oosRule
  );
}
