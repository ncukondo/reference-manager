/**
 * Object utility functions
 */

/**
 * Pick defined (non-undefined) properties from an object for specified keys.
 * Useful for building options objects where undefined values should be omitted
 * (especially with exactOptionalPropertyTypes).
 *
 * @param obj - Source object
 * @param keys - Keys to pick from the object
 * @returns New object with only defined values for specified keys
 */
export function pickDefined<T, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): { [P in K]?: Exclude<T[P], undefined> } {
  const result: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      (result as Record<K, unknown>)[key] = obj[key];
    }
  }
  return result as { [P in K]?: Exclude<T[P], undefined> };
}

/**
 * Deep equality comparison for arbitrary values.
 * Supports primitives, arrays, and plain objects (recursive).
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    if (aKeys.length !== Object.keys(bObj).length) return false;
    return aKeys.every((key) => isEqual(aObj[key], bObj[key]));
  }

  return false;
}
