import { describe, expect, it } from "vitest";
import { detectImageType } from "./cover";

const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0]);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

describe("detectImageType", () => {
  it("recognizes JPEG, PNG and WebP by their signature", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectImageType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP")))).toBe("image/webp");
  });

  it("rejects anything else, including SVG and files that only claim to be images", () => {
    expect(detectImageType(new Uint8Array(ascii('<svg xmlns="http://www.w3.org/2000/svg">')))).toBeNull();
    expect(detectImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(detectImageType(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE")))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});
