import { render } from "ink";
import { createElement } from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { restoreStdinAfterInk } from "../interactive/alternate-screen.js";
import { Select } from "../interactive/components/index.js";
import type { SelectOption } from "../interactive/components/index.js";
import { type FixActionType, applyFixAction, getFixActionsForFinding } from "./fix-actions.js";
import type { CheckFinding, CheckResult } from "./types.js";

export interface FixInteractionResult {
  totalFindings: number;
  applied: number;
  skipped: number;
  removed: string[];
}

function selectFixAction(
  message: string,
  options: SelectOption<FixActionType>[]
): Promise<FixActionType | null> {
  return new Promise<FixActionType | null>((resolve) => {
    let selected: FixActionType | null = null;

    const { waitUntilExit } = render(
      createElement(Select<FixActionType>, {
        options,
        message,
        onSelect: (value: FixActionType) => {
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

function getStatusLabel(type: string): string {
  switch (type) {
    case "retracted":
      return "RETRACTED";
    case "concern":
      return "CONCERN";
    case "version_changed":
      return "VERSION";
    case "metadata_mismatch":
      return "MISMATCH";
    case "metadata_outdated":
      return "OUTDATED";
    default:
      return "WARNING";
  }
}

function buildSelectOptions(finding: CheckFinding): SelectOption<FixActionType>[] {
  return getFixActionsForFinding(finding).map((a) => ({
    label: a.label,
    value: a.type,
  }));
}

async function processFinding(
  result: FixInteractionResult,
  library: ILibrary,
  item: CslItem,
  resultId: string,
  finding: CheckFinding
): Promise<void> {
  result.totalFindings++;
  const options = buildSelectOptions(finding);
  if (options.length === 0) return;

  const label = getStatusLabel(finding.type);
  const message = `[${label}] ${resultId}: ${finding.message}`;
  const selectedAction = await selectFixAction(message, options);

  if (selectedAction === null) {
    result.skipped++;
    return;
  }

  const actionResult = await applyFixAction(library, item, finding, selectedAction);

  if (!actionResult.applied) {
    process.stderr.write(`  Error: ${actionResult.message}\n`);
    return;
  }

  process.stderr.write(`  ${actionResult.message}\n`);
  if (selectedAction === "skip") {
    result.skipped++;
  } else {
    result.applied++;
    if (actionResult.removed) {
      result.removed.push(resultId);
    }
  }
}

export async function runFixInteraction(
  results: CheckResult[],
  library: ILibrary,
  findItem: (id: string) => CslItem | undefined
): Promise<FixInteractionResult> {
  const interactionResult: FixInteractionResult = {
    totalFindings: 0,
    applied: 0,
    skipped: 0,
    removed: [],
  };

  const warningResults = results.filter((r) => r.status === "warning");

  for (const checkResult of warningResults) {
    const item = findItem(checkResult.id);
    if (!item) continue;

    for (const finding of checkResult.findings) {
      await processFinding(interactionResult, library, item, checkResult.id, finding);
    }
  }

  return interactionResult;
}
