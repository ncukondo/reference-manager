import { describe, expect, it, vi } from "vitest";
import { createArchive } from "./url-archive.js";

describe("createArchive", () => {
  function createMockPage(mhtmlData: string, fullHtml: string) {
    const mockCdpSession = {
      send: vi.fn().mockResolvedValue({ data: mhtmlData }),
      detach: vi.fn().mockResolvedValue(undefined),
    };
    return {
      context: vi.fn().mockReturnValue({
        newCDPSession: vi.fn().mockResolvedValue(mockCdpSession),
      }),
      evaluate: vi.fn().mockResolvedValue(fullHtml),
    };
  }

  it("should create MHTML archive via CDP", async () => {
    const page = createMockPage("MHTML content here", "");

    const result = await createArchive(page as never, "mhtml");

    expect(result.data).toBe("MHTML content here");
    expect(result.extension).toBe("mhtml");
  });

  it("should create HTML archive from page content", async () => {
    const page = createMockPage("", "<html><body>Hello</body></html>");

    const result = await createArchive(page as never, "html");

    expect(result.data).toBe("<html><body>Hello</body></html>");
    expect(result.extension).toBe("html");
  });

  it("should detach CDP session after MHTML capture", async () => {
    const mockCdpSession = {
      send: vi.fn().mockResolvedValue({ data: "MHTML" }),
      detach: vi.fn().mockResolvedValue(undefined),
    };
    const page = {
      context: vi.fn().mockReturnValue({
        newCDPSession: vi.fn().mockResolvedValue(mockCdpSession),
      }),
      evaluate: vi.fn(),
    };

    await createArchive(page as never, "mhtml");

    expect(mockCdpSession.detach).toHaveBeenCalled();
  });
});
