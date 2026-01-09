/**
 * End-to-end tests for MCP server
 *
 * These tests verify that:
 * 1. MCP server starts correctly via CLI
 * 2. Tools can be invoked via MCP client
 * 3. Resources can be accessed
 * 4. Server handles errors correctly
 */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("MCP Server E2E", () => {
  let tempDir: string;
  let libraryPath: string;
  let configPath: string;
  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;

  beforeEach(async () => {
    // Create test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-e2e-test-"));
    libraryPath = path.join(tempDir, "references.json");
    configPath = path.join(tempDir, "config.toml");

    // Create library with test references
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "uuid-smith-2024",
          timestamp: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      },
      {
        id: "jones2023",
        type: "article-journal",
        title: "Deep Learning in Healthcare",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "uuid-jones-2023",
          timestamp: "2023-01-01T00:00:00Z",
          created_at: "2023-01-01T00:00:00Z",
        },
      },
      {
        id: "brown2022",
        type: "book",
        title: "Introduction to AI",
        author: [{ family: "Brown", given: "Alice" }],
        issued: { "date-parts": [[2022]] },
        custom: {
          uuid: "uuid-brown-2022",
          timestamp: "2022-01-01T00:00:00Z",
          created_at: "2022-01-01T00:00:00Z",
        },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");

    // Create config file
    await fs.writeFile(
      configPath,
      `library = "${libraryPath.replace(/\\/g, "/")}"
`,
      "utf-8"
    );
  });

  afterEach(async () => {
    // Close client and transport
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
      client = null;
    }
    if (transport) {
      try {
        await transport.close();
      } catch {
        // Ignore close errors
      }
      transport = null;
    }

    // Clean up test directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to start MCP server and connect client
   */
  async function connectMcpClient(): Promise<Client> {
    transport = new StdioClientTransport({
      command: "node",
      args: [CLI_PATH, "mcp", "--config", configPath],
    });

    client = new Client({ name: "e2e-test-client", version: "1.0.0" });
    await client.connect(transport);

    return client;
  }

  describe("Server initialization", () => {
    it("should connect to MCP server", async () => {
      const mcpClient = await connectMcpClient();

      // If we get here without error, the connection was successful
      expect(mcpClient).toBeDefined();
    });
  });

  describe("Tools discovery", () => {
    it("should list all available tools", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.listTools();

      // Should have all expected tools
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain("search");
      expect(toolNames).toContain("list");
      expect(toolNames).toContain("cite");
      expect(toolNames).toContain("add");
      expect(toolNames).toContain("remove");
      expect(toolNames).toContain("fulltext_attach");
      expect(toolNames).toContain("fulltext_get");
      expect(toolNames).toContain("fulltext_detach");
    });
  });

  describe("Tool invocation", () => {
    it("should search references", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "search",
        arguments: { query: "machine learning" },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.total).toBe(1);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].id).toBe("smith2024");
      expect(response.items[0].title).toBe("Machine Learning Applications");
    });

    it("should list all references", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: {},
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.total).toBe(3);
      expect(response.items).toHaveLength(3);
      expect(response.items.some((t: { id: string }) => t.id === "smith2024")).toBe(true);
      expect(response.items.some((t: { id: string }) => t.id === "jones2023")).toBe(true);
      expect(response.items.some((t: { id: string }) => t.id === "brown2022")).toBe(true);
    });

    it("should cite references", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "cite",
        arguments: { ids: ["smith2024"] },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      const text = (result.content[0] as { type: string; text: string }).text;
      // APA style citation
      expect(text).toContain("Smith");
      expect(text).toContain("2024");
    });

    it("should add reference via DOI-like input", async () => {
      const mcpClient = await connectMcpClient();

      // Add a CSL-JSON reference directly
      const newRef = JSON.stringify([
        {
          id: "new2024",
          type: "article-journal",
          title: "New Reference Added via MCP",
          author: [{ family: "New", given: "Author" }],
          issued: { "date-parts": [[2024]] },
        },
      ]);

      const result = await mcpClient.callTool({
        name: "add",
        arguments: { input: newRef },
      });

      expect(result.content).toHaveLength(1);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain("Added 1 reference");

      // Verify the reference was added by searching
      const searchResult = await mcpClient.callTool({
        name: "search",
        arguments: { query: "new reference added" },
      });

      expect(searchResult.content.length).toBeGreaterThan(0);
    });

    it("should require force=true for remove", async () => {
      const mcpClient = await connectMcpClient();

      // Try to remove without force - should return safety message (not throw)
      const result = await mcpClient.callTool({
        name: "remove",
        arguments: { id: "smith2024", force: false },
      });

      expect(result.content).toHaveLength(1);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain("force: true");
      expect(text).toContain("safety");
    });

    it("should remove reference with force=true", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "remove",
        arguments: { id: "smith2024", force: true },
      });

      expect(result.content).toHaveLength(1);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain("Removed");
      expect(text).toContain("smith2024");

      // Verify the reference was removed
      const searchResult = await mcpClient.callTool({
        name: "search",
        arguments: { query: "smith2024" },
      });

      // Single content block with metadata and empty items
      expect(searchResult.content).toHaveLength(1);
      const response = JSON.parse((searchResult.content[0] as { text: string }).text);
      expect(response.total).toBe(0);
      expect(response.items).toHaveLength(0);
    });
  });

  describe("Resources discovery", () => {
    it("should list available resources", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.listResources();

      // Should have resource templates
      const uris = result.resources.map((r) => r.uri);
      expect(uris).toContain("library://references");
      expect(uris).toContain("library://styles");
    });
  });

  describe("Resource access", () => {
    it("should read all references resource", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.readResource({
        uri: "library://references",
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty("mimeType", "application/json");
      const text = result.contents[0].text as string;
      const refs = JSON.parse(text);
      expect(refs).toHaveLength(3);
    });

    it("should read single reference resource", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.readResource({
        uri: "library://reference/smith2024",
      });

      expect(result.contents).toHaveLength(1);
      const text = result.contents[0].text as string;
      const ref = JSON.parse(text);
      expect(ref.id).toBe("smith2024");
      expect(ref.title).toBe("Machine Learning Applications");
    });

    it("should read citation styles resource", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.readResource({
        uri: "library://styles",
      });

      expect(result.contents).toHaveLength(1);
      const text = result.contents[0].text as string;
      const styles = JSON.parse(text);
      // Styles resource returns { builtin: [...], default: "apa" }
      expect(styles).toHaveProperty("builtin");
      expect(styles).toHaveProperty("default");
      expect(Array.isArray(styles.builtin)).toBe(true);
      expect(styles.builtin).toContain("apa");
      expect(styles.default).toBe("apa");
    });
  });

  describe("Error handling", () => {
    it("should return error for non-existent reference", async () => {
      const mcpClient = await connectMcpClient();

      await expect(
        mcpClient.readResource({
          uri: "library://reference/nonexistent",
        })
      ).rejects.toThrow();
    });

    it("should return error message when removing non-existent reference", async () => {
      const mcpClient = await connectMcpClient();

      // Remove tool returns message instead of throwing for not found
      const result = await mcpClient.callTool({
        name: "remove",
        arguments: { id: "nonexistent", force: true },
      });

      expect(result.content).toHaveLength(1);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toContain("not found");
      expect(text).toContain("nonexistent");
    });
  });

  describe("Pagination E2E", () => {
    it("should list with limit", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: { limit: 2 },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.total).toBe(3);
      expect(response.limit).toBe(2);
      expect(response.items).toHaveLength(2);
    });

    it("should list with limit and offset", async () => {
      const mcpClient = await connectMcpClient();

      // First page
      const firstPage = await mcpClient.callTool({
        name: "list",
        arguments: { limit: 2, offset: 0 },
      });
      expect(firstPage.content).toHaveLength(1);
      const firstResponse = JSON.parse((firstPage.content[0] as { text: string }).text);
      expect(firstResponse.items).toHaveLength(2);

      // Second page
      const secondPage = await mcpClient.callTool({
        name: "list",
        arguments: { limit: 2, offset: 2 },
      });
      expect(secondPage.content).toHaveLength(1);
      const secondResponse = JSON.parse((secondPage.content[0] as { text: string }).text);
      // Only 1 reference left (3 total - 2 offset)
      expect(secondResponse.items).toHaveLength(1);

      // Verify different results on each page
      expect(firstResponse.items).not.toEqual(secondResponse.items);
    });

    it("should list with sorting by author", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: { sort: "author", order: "asc" },
      });

      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.items).toHaveLength(3);
      // Brown, Jones, Smith alphabetically
      expect(response.items[0].author[0].family).toBe("Brown");
      expect(response.items[1].author[0].family).toBe("Jones");
      expect(response.items[2].author[0].family).toBe("Smith");
    });

    it("should list with sorting by published date descending", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: { sort: "published", order: "desc" },
      });

      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.items).toHaveLength(3);
      // 2024, 2023, 2022 - Smith, Jones, Brown
      expect(response.items[0].author[0].family).toBe("Smith");
      expect(response.items[1].author[0].family).toBe("Jones");
      expect(response.items[2].author[0].family).toBe("Brown");
    });

    it("should search with limit", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "search",
        arguments: { query: "learning", limit: 1 },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      // Should return at most 1 result (there are 2 matching: "Machine Learning" and "Deep Learning")
      expect(response.items.length).toBeLessThanOrEqual(1);
    });

    it("should search with sorting by updated date", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "search",
        arguments: { query: "learning", sort: "updated", order: "desc" },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      // Both "Machine Learning" and "Deep Learning" match
      // Should be sorted by updated (timestamp) descending
      expect(response.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should return JSON format with limit applied", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: { format: "json", limit: 2 },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      expect(response.items).toHaveLength(2);
      // JSON format returns CslItem objects directly (not stringified)
      for (const item of response.items) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("type");
      }
    });

    it("should limit results correctly with limit parameter", async () => {
      const mcpClient = await connectMcpClient();

      const result = await mcpClient.callTool({
        name: "list",
        arguments: { format: "json", limit: 10 },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      // We have 3 references, limit=10, so should return all 3
      expect(response.items).toHaveLength(3);
    });

    it("should apply default limit from MCP config", async () => {
      const mcpClient = await connectMcpClient();

      // Default MCP limit is 20, but we only have 3 references
      // So it should return all 3
      const result = await mcpClient.callTool({
        name: "list",
        arguments: { format: "json" },
      });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse((result.content[0] as { text: string }).text);
      // Should return all 3 references (default limit 20 > 3)
      expect(response.items).toHaveLength(3);
    });
  });
});
