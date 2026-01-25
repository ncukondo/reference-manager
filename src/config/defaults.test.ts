import { describe, expect, test } from "vitest";
import {
  getDefaultBackupDirectory,
  getDefaultCslDirectory,
  getDefaultFulltextDirectory,
  getDefaultLibraryPath,
  getDefaultUserConfigPath,
} from "./defaults.js";
import { getPaths } from "./paths.js";

describe("default paths", () => {
  const paths = getPaths();

  test("getDefaultUserConfigPath() uses config path", () => {
    const configPath = getDefaultUserConfigPath();
    expect(configPath).toContain(paths.config);
    expect(configPath).toMatch(/config\.toml$/);
  });

  test("getDefaultLibraryPath() uses data path", () => {
    const libraryPath = getDefaultLibraryPath();
    expect(libraryPath).toContain(paths.data);
    expect(libraryPath).toMatch(/library\.json$/);
  });

  test("getDefaultCslDirectory() uses data path", () => {
    const cslDir = getDefaultCslDirectory();
    expect(cslDir).toContain(paths.data);
    expect(cslDir).toMatch(/csl$/);
  });

  test("getDefaultFulltextDirectory() uses attachments directory (deprecated)", () => {
    // getDefaultFulltextDirectory is deprecated and now returns attachments directory
    const fulltextDir = getDefaultFulltextDirectory();
    expect(fulltextDir).toContain(paths.data);
    expect(fulltextDir).toMatch(/attachments$/);
  });

  test("getDefaultBackupDirectory() uses cache path", () => {
    const backupDir = getDefaultBackupDirectory();
    expect(backupDir).toContain(paths.cache);
    expect(backupDir).toMatch(/backups$/);
  });
});
