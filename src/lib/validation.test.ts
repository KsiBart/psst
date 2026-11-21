import { describe, expect, it } from "vitest";
import { safeUrl, uniqueNames } from "./validation";

describe("safeUrl", () => {
  it("accepts http(s) and bare domains", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("example.com")).toBe("https://example.com/");
    expect(safeUrl("")).toBeNull();
  });
  it("rejects dangerous schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBe(false);
    expect(safeUrl("data:text/html,hi")).toBe(false);
    expect(safeUrl("ftp://example.com")).toBe(false);
  });
});

describe("uniqueNames", () => {
  it("trims and dedupes case-insensitively", () => {
    expect(uniqueNames([" Anna ", "anna", "Bartek", "", "Ola  Nowak"])).toEqual(["Anna", "Bartek", "Ola Nowak"]);
  });
});
