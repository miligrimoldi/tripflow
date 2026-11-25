import { describe, expect, it } from "vitest";
import { oauthErrorMessage } from "./oauth-errors";

describe("oauthErrorMessage", () => {
  it("explains the expected cases", () => {
    expect(oauthErrorMessage("account_not_linked")).toMatch(/email y contraseña/);
    expect(oauthErrorMessage("access_denied")).toMatch(/Cancelaste/);
    expect(oauthErrorMessage("state_mismatch")).toMatch(/interrumpió/);
  });

  it("has a generic message for anything else, and nothing without an error", () => {
    expect(oauthErrorMessage("invalid_code")).toMatch(/No pudimos ingresar con Google/);
    expect(oauthErrorMessage(undefined)).toBeNull();
    expect(oauthErrorMessage("")).toBeNull();
    expect(oauthErrorMessage(["account_not_linked"])).toBeNull();
  });
});
