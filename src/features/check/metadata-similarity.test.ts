import { describe, expect, it } from "vitest";
import { isAuthorSimilar, isTitleSimilar } from "./metadata-similarity.js";

describe("isTitleSimilar", () => {
  it("should return similar for identical titles", () => {
    const result = isTitleSimilar(
      "Effect of Drug X on Blood Pressure",
      "Effect of Drug X on Blood Pressure"
    );
    expect(result).toBe(true);
  });

  it("should return similar when subtitle is added", () => {
    const result = isTitleSimilar(
      "Effect of Drug X on Blood Pressure",
      "Effect of Drug X on Blood Pressure: A Randomized Trial"
    );
    expect(result).toBe(true);
  });

  it("should return similar when title is significantly extended", () => {
    const result = isTitleSimilar(
      "Deep Learning Methods",
      "Deep Learning Methods for Natural Language Processing and Computer Vision"
    );
    expect(result).toBe(true);
  });

  it("should return mismatched for completely different titles", () => {
    const result = isTitleSimilar(
      "Quantum Mechanics in Modern Physics",
      "Economic Growth in Developing Countries"
    );
    expect(result).toBe(false);
  });

  it("should return mismatched for same-field different papers", () => {
    const result = isTitleSimilar(
      "Deep Learning for Image Classification",
      "Reinforcement Learning for Image Segmentation"
    );
    expect(result).toBe(false);
  });

  it("should return similar for typo corrections", () => {
    const result = isTitleSimilar(
      "Effect of Drg X on Blod Pressure in Hypertensive Patients",
      "Effect of Drug X on Blood Pressure in Hypertensive Patients"
    );
    expect(result).toBe(true);
  });

  it("should return mismatched for short title with coincidental overlap", () => {
    // Short titles where overlap is coincidental
    const result = isTitleSimilar("Machine Learning", "Machine Translation");
    expect(result).toBe(false);
  });

  it("should handle empty local title gracefully", () => {
    const result = isTitleSimilar("", "Some Remote Title");
    expect(result).toBe(true);
  });

  it("should handle empty remote title gracefully", () => {
    const result = isTitleSimilar("Some Local Title", "");
    expect(result).toBe(true);
  });

  it("should handle both titles empty", () => {
    const result = isTitleSimilar("", "");
    expect(result).toBe(true);
  });

  it("should handle undefined titles gracefully", () => {
    expect(isTitleSimilar(undefined, "Remote Title")).toBe(true);
    expect(isTitleSimilar("Local Title", undefined)).toBe(true);
    expect(isTitleSimilar(undefined, undefined)).toBe(true);
  });

  it("should ignore case and diacritics differences", () => {
    const result = isTitleSimilar(
      "Étude des Propriétés Magnétiques",
      "Etude des Proprietes Magnetiques"
    );
    expect(result).toBe(true);
  });

  it("should ignore punctuation differences", () => {
    const result = isTitleSimilar("Effect of Drug X: A Study", "Effect of Drug X - A Study");
    expect(result).toBe(true);
  });
});

describe("isAuthorSimilar", () => {
  it("should return similar when co-authors are added", () => {
    const local = [{ family: "Smith" }, { family: "Jones" }];
    const remote = [{ family: "Smith" }, { family: "Jones" }, { family: "Brown" }];
    expect(isAuthorSimilar(local, remote)).toBe(true);
  });

  it("should return mismatched for completely different authors", () => {
    const local = [{ family: "Smith" }, { family: "Jones" }];
    const remote = [{ family: "Brown" }, { family: "Davis" }];
    expect(isAuthorSimilar(local, remote)).toBe(false);
  });

  it("should return similar when one author replaced out of three", () => {
    const local = [{ family: "Smith" }, { family: "Jones" }, { family: "Brown" }];
    const remote = [{ family: "Smith" }, { family: "Jones" }, { family: "Davis" }];
    // 2/3 overlap >= 0.5
    expect(isAuthorSimilar(local, remote)).toBe(true);
  });

  it("should return similar for single author match", () => {
    const local = [{ family: "Smith" }];
    const remote = [{ family: "Smith" }];
    expect(isAuthorSimilar(local, remote)).toBe(true);
  });

  it("should return mismatched for single author mismatch", () => {
    const local = [{ family: "Smith" }];
    const remote = [{ family: "Jones" }];
    expect(isAuthorSimilar(local, remote)).toBe(false);
  });

  it("should handle diacritics difference", () => {
    const local = [{ family: "García" }, { family: "López" }];
    const remote = [{ family: "Garcia" }, { family: "Lopez" }];
    expect(isAuthorSimilar(local, remote)).toBe(true);
  });

  it("should skip comparison when local authors are empty", () => {
    const remote = [{ family: "Smith" }];
    expect(isAuthorSimilar([], remote)).toBe(true);
  });

  it("should skip comparison when remote authors are empty", () => {
    const local = [{ family: "Smith" }];
    expect(isAuthorSimilar(local, [])).toBe(true);
  });

  it("should skip comparison when both are empty", () => {
    expect(isAuthorSimilar([], [])).toBe(true);
  });

  it("should skip comparison when undefined", () => {
    expect(isAuthorSimilar(undefined, undefined)).toBe(true);
    expect(isAuthorSimilar(undefined, [{ family: "Smith" }])).toBe(true);
    expect(isAuthorSimilar([{ family: "Smith" }], undefined)).toBe(true);
  });

  it("should handle authors without family names", () => {
    const local = [{ given: "John" }, { family: "Smith" }];
    const remote = [{ family: "Smith" }, { family: "Jones" }];
    // Only "Smith" has family name in local, 1/1 matches
    expect(isAuthorSimilar(local, remote)).toBe(true);
  });
});
