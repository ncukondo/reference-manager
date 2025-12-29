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
