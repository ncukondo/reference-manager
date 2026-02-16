import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CheckOperationOptions } from "../../features/operations/check.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

export interface CheckToolParams {
  ids?: string[] | undefined;
  all?: boolean | undefined;
  skipDays?: number | undefined;
  save?: boolean | undefined;
  metadata?: boolean | undefined;
}

function formatCheckResult(result: Awaited<ReturnType<ILibraryOperations["check"]>>): string {
  const lines: string[] = [];

  for (const r of result.results) {
    if (r.status === "ok") {
      lines.push(`[OK] ${r.id}`);
    } else if (r.status === "skipped") {
      lines.push(`[SKIPPED] ${r.id}`);
    } else {
      for (const f of r.findings) {
        lines.push(`[${f.type.toUpperCase()}] ${r.id}: ${f.message}`);
      }
    }
  }

  const { summary } = result;
  lines.push(
    `\nSummary: ${summary.total} checked, ${summary.ok} ok, ${summary.warnings} warnings, ${summary.skipped} skipped`
  );

  return lines.join("\n");
}

export function registerCheckTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  server.registerTool(
    "check",
    {
      description:
        "Check references for retractions, expressions of concern, and version changes by querying Crossref and PubMed APIs.",
      inputSchema: {
        ids: z
          .array(z.string())
          .optional()
          .describe("Array of reference IDs to check. Omit if using 'all'."),
        all: z.boolean().optional().describe("Check all references in library"),
        skipDays: z
          .number()
          .optional()
          .describe("Skip references checked within n days (default: 7)"),
        save: z.boolean().optional().describe("Whether to save results to library (default: true)"),
        metadata: z
          .boolean()
          .optional()
          .describe("Compare metadata against remote sources (default: true)"),
      },
    },
    async (args: CheckToolParams) => {
      const libraryOps = getLibraryOperations();

      const options: CheckOperationOptions = {};
      if (args.ids?.length) options.identifiers = args.ids;
      if (args.all) options.all = true;
      if (args.skipDays !== undefined) options.skipDays = args.skipDays;
      if (args.save !== undefined) options.save = args.save;
      if (args.metadata !== undefined) options.metadata = args.metadata;

      const result = await libraryOps.check(options);

      const text = formatCheckResult(result);

      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );
}
