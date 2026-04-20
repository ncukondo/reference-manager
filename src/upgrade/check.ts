/**
 * Update-check cache + GitHub Releases API client.
 *
 * Fetches the latest release tag from GitHub and caches the result for 24 hours
 * at `{data}/update-check.json`. Network/parse failures are swallowed (returns null)
 * so the caller can ignore them silently.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPaths } from "../config/paths.js";
import { writeFileAtomic } from "../utils/file.js";

export interface ReleaseInfo {
  checkedAt: string;
  latest: string;
  url: string;
}

export interface GetLatestVersionOptions {
  force?: boolean;
  cachePath?: string;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const RELEASES_API_URL = "https://api.github.com/repos/ncukondo/reference-manager/releases/latest";

function defaultCachePath(): string {
  return join(getPaths().data, "update-check.json");
}

function normalizeTag(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

async function readCache(cachePath: string): Promise<ReleaseInfo | null> {
  try {
    const text = await readFile(cachePath, "utf-8");
    const parsed = JSON.parse(text) as Partial<ReleaseInfo>;
    if (
      typeof parsed.checkedAt === "string" &&
      typeof parsed.latest === "string" &&
      typeof parsed.url === "string"
    ) {
      return { checkedAt: parsed.checkedAt, latest: parsed.latest, url: parsed.url };
    }
    return null;
  } catch {
    return null;
  }
}

function isFresh(cache: ReleaseInfo, now: Date, ttlMs: number): boolean {
  const checkedAt = Date.parse(cache.checkedAt);
  if (Number.isNaN(checkedAt)) return false;
  return now.getTime() - checkedAt < ttlMs;
}

interface ReleaseApiResponse {
  tag_name?: unknown;
  html_url?: unknown;
}

export async function getLatestVersion(
  options: GetLatestVersionOptions = {}
): Promise<ReleaseInfo | null> {
  const {
    force = false,
    cachePath = defaultCachePath(),
    fetch: fetchFn = globalThis.fetch,
    now = () => new Date(),
    ttlMs = DEFAULT_TTL_MS,
  } = options;

  const currentTime = now();
  const cached = await readCache(cachePath);

  if (!force && cached && isFresh(cached, currentTime, ttlMs)) {
    return cached;
  }

  let response: Response;
  try {
    response = await fetchFn(RELEASES_API_URL, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "reference-manager-update-check",
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let payload: ReleaseApiResponse;
  try {
    payload = (await response.json()) as ReleaseApiResponse;
  } catch {
    return null;
  }

  if (typeof payload.tag_name !== "string" || typeof payload.html_url !== "string") {
    return null;
  }

  const info: ReleaseInfo = {
    checkedAt: currentTime.toISOString(),
    latest: normalizeTag(payload.tag_name),
    url: payload.html_url,
  };

  try {
    await writeFileAtomic(cachePath, `${JSON.stringify(info, null, 2)}\n`);
  } catch {
    // Cache write failure should not affect the returned value.
  }

  return info;
}
