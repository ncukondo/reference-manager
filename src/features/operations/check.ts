import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";
import type { CheckResult } from "../check/types.js";

export interface CheckOperationOptions {
  identifiers?: string[];
  idType?: IdentifierType;
  all?: boolean;
  searchQuery?: string;
  skipDays?: number;
  save?: boolean;
  config?: { email?: string; pubmed?: { email?: string; apiKey?: string } };
}

export interface CheckOperationResult {
  results: CheckResult[];
  summary: {
    total: number;
    ok: number;
    warnings: number;
    skipped: number;
  };
}

/**
 * Check references for status changes (retractions, version updates, etc.).
 *
 * @param library - The library to check references in
 * @param options - Check operation options
 * @returns Check results with summary
 */
const CHECK_CONCURRENCY = 5;

interface IndexedTask {
  index: number;
  item: CslItem;
  skip: boolean;
}

export async function checkReferences(
  library: ILibrary,
  options: CheckOperationOptions
): Promise<CheckOperationResult> {
  const { checkReference } = await import("../check/checker.js");
  const save = options.save !== false;
  const skipDays = options.skipDays ?? 7;

  const items = await resolveItems(library, options);
  const tasks = items.map((item, index) => ({
    index,
    item,
    skip: shouldSkipRecentCheck(item, skipDays),
  }));

  const results: CheckResult[] = new Array(items.length);

  fillSkippedResults(tasks, results);

  const toCheck = tasks.filter((t) => !t.skip);
  await checkInParallel(toCheck, results, checkReference, options.config);

  if (save) {
    await saveAllResults(library, toCheck, results);
  }

  return { results, summary: computeSummary(results) };
}

/**
 * Fill results for items that should be skipped (recently checked).
 */
function fillSkippedResults(tasks: IndexedTask[], results: CheckResult[]): void {
  for (const task of tasks) {
    if (task.skip) {
      results[task.index] = {
        id: task.item.id,
        uuid: (task.item.custom?.uuid as string) ?? "",
        status: "skipped",
        findings: [],
        checkedAt: (task.item.custom?.check as Record<string, unknown>)?.checked_at as string,
        checkedSources: [],
      };
    }
  }
}

/**
 * Check items in parallel with concurrency control.
 */
async function checkInParallel(
  tasks: IndexedTask[],
  results: CheckResult[],
  checkFn: (item: CslItem, config?: CheckOperationOptions["config"]) => Promise<CheckResult>,
  config?: CheckOperationOptions["config"]
): Promise<void> {
  for (let i = 0; i < tasks.length; i += CHECK_CONCURRENCY) {
    const chunk = tasks.slice(i, i + CHECK_CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((task) => checkFn(task.item, config)));

    for (const [j, task] of chunk.entries()) {
      const outcome = settled[j];
      results[task.index] =
        outcome?.status === "fulfilled" ? outcome.value : buildFallbackResult(task.item);
    }
  }
}

/**
 * Build a fallback result when an API call fails.
 */
function buildFallbackResult(item: CslItem): CheckResult {
  return {
    id: item.id,
    uuid: (item.custom?.uuid as string) ?? "",
    status: "ok",
    findings: [],
    checkedAt: new Date().toISOString(),
    checkedSources: [],
  };
}

/**
 * Save check results sequentially (library is not concurrent-safe).
 */
async function saveAllResults(
  library: ILibrary,
  tasks: IndexedTask[],
  results: CheckResult[]
): Promise<void> {
  for (const task of tasks) {
    const result = results[task.index] as CheckResult;
    if (result.status !== "skipped") {
      await saveCheckResult(library, task.item, result);
    }
  }
  if (results.some((r) => r.status !== "skipped")) {
    await library.save();
  }
}

/**
 * Resolve target references based on options.
 */
async function resolveItems(library: ILibrary, options: CheckOperationOptions): Promise<CslItem[]> {
  if (options.all) {
    return library.getAll();
  }

  if (options.searchQuery) {
    const { searchReferences } = await import("./search.js");
    const result = await searchReferences(library, { query: options.searchQuery });
    return result.items;
  }

  if (options.identifiers && options.identifiers.length > 0) {
    const idType = options.idType ?? "id";
    const items: CslItem[] = [];
    for (const identifier of options.identifiers) {
      const item = await library.find(identifier, { idType });
      if (!item) {
        throw new Error(`Reference not found: ${identifier}`);
      }
      items.push(item);
    }
    return items;
  }

  return [];
}

/**
 * Check if a reference was recently checked and should be skipped.
 */
function shouldSkipRecentCheck(item: CslItem, skipDays: number): boolean {
  if (skipDays <= 0) return false;

  const check = item.custom?.check as Record<string, unknown> | undefined;
  if (!check?.checked_at) return false;

  const checkedAt = new Date(check.checked_at as string);
  const now = new Date();
  const daysSince = (now.getTime() - checkedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < skipDays;
}

/**
 * Save check result to custom.check field of a reference.
 */
async function saveCheckResult(
  library: ILibrary,
  item: CslItem,
  result: CheckResult
): Promise<void> {
  const checkData = {
    checked_at: result.checkedAt,
    status: result.status === "warning" ? (result.findings[0]?.type ?? "warning") : result.status,
    findings: result.findings.map((f) => ({
      type: f.type,
      message: f.message,
      ...(f.details ? { details: snakeCaseKeys(f.details) } : {}),
    })),
  };

  const existingCustom = (item.custom ?? {}) as Record<string, unknown>;
  await library.update(item.id, {
    custom: { ...existingCustom, check: checkData },
  });
}

/**
 * Convert camelCase keys to snake_case for storage.
 */
function snakeCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Compute summary from results.
 */
function computeSummary(results: CheckResult[]): CheckOperationResult["summary"] {
  return {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    warnings: results.filter((r) => r.status === "warning").length,
    skipped: results.filter((r) => r.status === "skipped").length,
  };
}
