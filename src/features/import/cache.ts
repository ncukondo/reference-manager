/**
 * Response cache for PMID and DOI metadata
 *
 * In-memory cache with TTL to avoid redundant API calls.
 * - Per ADR-001: No persistent cache files on disk
 * - Cache is warm during interactive sessions (server mode)
 * - CLI invocations start fresh
 */

import type { CslItem } from "../../core/csl-json/types.js";

/** Default TTL: 1 hour */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs?: number;
}

/**
 * Cache entry with timestamp and TTL
 */
interface CacheEntry {
  item: CslItem;
  cachedAt: number;
  ttlMs: number;
}

/** PMID cache: Map<pmid, CacheEntry> */
const pmidCache = new Map<string, CacheEntry>();

/** DOI cache: Map<doi, CacheEntry> */
const doiCache = new Map<string, CacheEntry>();

/** ISBN cache: Map<isbn, CacheEntry> */
const isbnCache = new Map<string, CacheEntry>();

/**
 * Check if a cache entry is still valid
 */
function isEntryValid(entry: CacheEntry): boolean {
  const now = Date.now();
  return now - entry.cachedAt < entry.ttlMs;
}

/**
 * Get item from cache if valid
 */
function getFromCache(cache: Map<string, CacheEntry>, key: string): CslItem | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }
  if (!isEntryValid(entry)) {
    cache.delete(key);
    return undefined;
  }
  return entry.item;
}

/**
 * Store item in cache
 */
function storeInCache(
  cache: Map<string, CacheEntry>,
  key: string,
  item: CslItem,
  config?: CacheConfig
): void {
  const ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
  cache.set(key, {
    item,
    cachedAt: Date.now(),
    ttlMs,
  });
}

/**
 * Get cached PMID result
 */
export function getPmidFromCache(pmid: string): CslItem | undefined {
  return getFromCache(pmidCache, pmid);
}

/**
 * Cache PMID result
 */
export function cachePmidResult(pmid: string, item: CslItem, config?: CacheConfig): void {
  storeInCache(pmidCache, pmid, item, config);
}

/**
 * Get cached DOI result
 */
export function getDoiFromCache(doi: string): CslItem | undefined {
  return getFromCache(doiCache, doi);
}

/**
 * Cache DOI result
 */
export function cacheDoiResult(doi: string, item: CslItem, config?: CacheConfig): void {
  storeInCache(doiCache, doi, item, config);
}

/**
 * Get cached ISBN result
 */
export function getIsbnFromCache(isbn: string): CslItem | undefined {
  return getFromCache(isbnCache, isbn);
}

/**
 * Cache ISBN result
 */
export function cacheIsbnResult(isbn: string, item: CslItem, config?: CacheConfig): void {
  storeInCache(isbnCache, isbn, item, config);
}

/**
 * Reset all caches (for test isolation)
 */
export function resetCache(): void {
  pmidCache.clear();
  doiCache.clear();
  isbnCache.clear();
}
