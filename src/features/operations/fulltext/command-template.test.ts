import { describe, expect, it } from "vitest";
import { expandTemplate } from "./command-template.js";

describe("expandTemplate", () => {
  it("should substitute {input} and {output} with shell quoting", () => {
    const result = expandTemplate("convert {input} {output}", {
      input: "/path/to/input.pdf",
      output: "/path/to/output.md",
    });
    expect(result).toBe("convert '/path/to/input.pdf' '/path/to/output.md'");
  });

  it("should substitute {input_dir}", () => {
    const result = expandTemplate("convert --dir {input_dir} {input}", {
      input: "/home/user/refs/Smith-2024/fulltext.pdf",
      output: "/home/user/refs/Smith-2024/fulltext.md",
    });
    expect(result).toBe(
      "convert --dir '/home/user/refs/Smith-2024' '/home/user/refs/Smith-2024/fulltext.pdf'"
    );
  });

  it("should substitute {input_name} and {output_name}", () => {
    const result = expandTemplate("convert --in {input_name} --out {output_name}", {
      input: "/home/user/refs/Smith-2024/fulltext.pdf",
      output: "/home/user/refs/Smith-2024/fulltext.md",
    });
    expect(result).toBe("convert --in 'fulltext.pdf' --out 'fulltext.md'");
  });

  it("should substitute all placeholders in a single command", () => {
    const result = expandTemplate(
      "tool --input {input} --output {output} --dir {input_dir} --iname {input_name} --oname {output_name}",
      {
        input: "/data/paper.pdf",
        output: "/data/paper.md",
      }
    );
    expect(result).toBe(
      "tool --input '/data/paper.pdf' --output '/data/paper.md' --dir '/data' --iname 'paper.pdf' --oname 'paper.md'"
    );
  });

  it("should safely handle paths with spaces", () => {
    const result = expandTemplate("convert {input} {output}", {
      input: "/path/to/my papers/input file.pdf",
      output: "/path/to/my papers/output file.md",
    });
    expect(result).toBe(
      "convert '/path/to/my papers/input file.pdf' '/path/to/my papers/output file.md'"
    );
  });

  it("should handle Windows-style paths", () => {
    const result = expandTemplate("convert {input} {output}", {
      input: "C:\\Users\\user\\refs\\Smith-2024\\fulltext.pdf",
      output: "C:\\Users\\user\\refs\\Smith-2024\\fulltext.md",
    });
    expect(result).toBe(
      "convert 'C:\\Users\\user\\refs\\Smith-2024\\fulltext.pdf' 'C:\\Users\\user\\refs\\Smith-2024\\fulltext.md'"
    );
  });

  it("should derive {input_dir} using platform dirname", () => {
    const result = expandTemplate("{input_dir}", {
      input: "/home/user/refs/paper.pdf",
      output: "/home/user/refs/paper.md",
    });
    expect(result).toBe("'/home/user/refs'");
  });

  it("should handle command with no placeholders", () => {
    const result = expandTemplate("echo hello", {
      input: "/input.pdf",
      output: "/output.md",
    });
    expect(result).toBe("echo hello");
  });

  it("should handle multiple occurrences of same placeholder", () => {
    const result = expandTemplate("{input} {input}", {
      input: "/a.pdf",
      output: "/a.md",
    });
    expect(result).toBe("'/a.pdf' '/a.pdf'");
  });

  it("should escape single quotes in paths to prevent command injection", () => {
    const result = expandTemplate("convert {input} {output}", {
      input: "/path/to/file'; rm -rf /; echo '.pdf",
      output: "/path/to/output.md",
    });
    // Each embedded ' becomes '\'' — the dangerous part stays inside single quotes
    expect(result).toBe(
      "convert '/path/to/file'\\''; rm -rf /; echo '\\''.pdf' '/path/to/output.md'"
    );
  });
});
