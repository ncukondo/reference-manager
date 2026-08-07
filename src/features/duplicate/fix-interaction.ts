/**
 * Interactive keeper selection for `ref duplicates --fix` (#108).
 *
 * Mirrors `src/features/check/fix-interaction.ts`: an Ink `Select` per group, TTY only. Which
 * record to keep is a judgement call the tool cannot make — `suggestKeeper` only decides which
 * option is pre-selected.
 */

import { render } from "ink";
import { createElement } from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { restoreStdinAfterInk } from "../interactive/alternate-screen.js";
import { Select } from "../interactive/components/index.js";
import type { SelectOption } from "../interactive/components/index.js";
import { markGroupDuplicates } from "../operations/duplicates.js";
import type { DuplicateGroup } from "./scanner.js";
import { suggestKeeper } from "./scanner.js";

export interface DuplicateFixResult {
  /** Groups presented to the user */
  groups: number;
  /** Groups where a keeper was chosen and pointers were written */
  fixed: number;
  /** Groups the user skipped or cancelled out of */
  skipped: number;
  /** References that now point at a keeper */
  marked: string[];
  /** References that could not be marked, with the reason */
  failed: { id: string; error: string }[];
}

/** Sentinel value for the "leave this group alone" option. */
const SKIP = "__skip__";

function selectKeeper(message: string, options: SelectOption<string>[]): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let selected: string | null = null;

    const { waitUntilExit } = render(
      createElement(Select<string>, {
        options,
        message,
        onSelect: (value: string) => {
          selected = value;
        },
        onCancel: () => {
          selected = null;
        },
      })
    );

    waitUntilExit()
      .then(() => {
        restoreStdinAfterInk();
        resolve(selected);
      })
      .catch(() => {
        restoreStdinAfterInk();
        resolve(null);
      });
  });
}

/** One-line description of a candidate, enough to tell versions of the same work apart. */
export function describeCandidate(item: CslItem, suggested: boolean): string {
  const year = item.issued?.["date-parts"]?.[0]?.[0];
  const parts = [item.id];
  if (year) parts.push(String(year));
  if (item["container-title"]) parts.push(String(item["container-title"]));
  if (item.volume) {
    parts.push(item.issue ? `${item.volume}(${item.issue})` : item.volume);
  }
  if (item.page) parts.push(item.page);
  const line = parts.join(" · ");
  return suggested ? `${line}  [suggested]` : line;
}

/** Header naming what put the group together. */
export function describeGroup(group: DuplicateGroup): string {
  const matched = group.types.map((type) => `${type}=${group.keys[type]}`).join(", ");
  return `${group.items.length} references match on ${matched}`;
}

function buildOptions(group: DuplicateGroup, suggested: CslItem): SelectOption<string>[] {
  const ordered = [suggested, ...group.items.filter((i) => i !== suggested)];
  const options: SelectOption<string>[] = ordered.map((item) => ({
    label: `Keep ${describeCandidate(item, item === suggested)}`,
    value: item.id,
  }));
  options.push({ label: "Skip this group", value: SKIP });
  return options;
}

/**
 * Walk the groups, asking which reference to keep, and point the rest at it.
 *
 * @param groups - Groups from a scan
 * @param library - The library to modify
 */
export async function runDuplicateFixInteraction(
  groups: DuplicateGroup[],
  library: ILibrary
): Promise<DuplicateFixResult> {
  const result: DuplicateFixResult = {
    groups: groups.length,
    fixed: 0,
    skipped: 0,
    marked: [],
    failed: [],
  };

  for (const group of groups) {
    const suggested = suggestKeeper(group.items);
    const choice = await selectKeeper(describeGroup(group), buildOptions(group, suggested));

    if (choice === null || choice === SKIP) {
      result.skipped++;
      continue;
    }

    const keeper = group.items.find((item) => item.id === choice);
    if (!keeper) {
      result.skipped++;
      continue;
    }

    const marked = await markGroupDuplicates(library, keeper, group.items);
    result.marked.push(...marked.marked);
    result.failed.push(...marked.failed);
    if (marked.marked.length > 0) {
      result.fixed++;
      process.stderr.write(`  Marked ${marked.marked.join(", ")} as superseded by ${keeper.id}\n`);
    }
    for (const failure of marked.failed) {
      process.stderr.write(`  Error: could not mark ${failure.id} (${failure.error})\n`);
    }
  }

  return result;
}
