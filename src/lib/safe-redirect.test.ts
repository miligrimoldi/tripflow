import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./safe-redirect";

describe("safeCallbackUrl", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeCallbackUrl("/invite/abc")).toBe("/invite/abc");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", undefined, 42])(
    "falls back for unsafe value %s",
    (value) => {
      expect(safeCallbackUrl(value)).toBe("/trips");
    },
  );
});
