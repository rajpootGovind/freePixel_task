import { createReadStream, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageProcessingError, getMetadata, thumbnail, transform } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

// rotated-exif.jpg: raw pixel grid is 120x60, EXIF orientation 6.
// Anything orientation-aware must treat it as 60x120.
const ROTATED = fixture("rotated-exif.jpg");
const PNG = fixture("plain.png");
const WEBP = fixture("sample.webp");
const CORRUPT = fixture("corrupt.bin");

describe("transform", () => {
  it("resizes to the requested dimensions", async () => {
    const result = await transform(PNG, { width: 40, height: 20 });
    expect(result.width).toBe(40);
    expect(result.height).toBe(20);
  });

  it.each(["jpeg", "png", "webp", "avif"] as const)("converts to %s", async (format) => {
    const result = await transform(PNG, { format, width: 32 });
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe(format === "avif" ? "heif" : format);
    // our own reported format should match what was requested, not sharp's internal name
    expect(result.format).toBe(format);
  });

  it("converts an existing webp to jpeg", async () => {
    const result = await transform(WEBP, { format: "jpeg" });
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("jpeg");
  });

  it("auto-rotates output pixels to match EXIF orientation", async () => {
    const result = await transform(ROTATED, { format: "png" });
    const meta = await sharp(result.data).metadata();
    // 120x60 raw + orientation 6 -> visually 60x120 once rotated
    expect(meta.width).toBe(60);
    expect(meta.height).toBe(120);
  });

  it("accepts a Buffer input", async () => {
    const result = await transform(readFileSync(PNG), { width: 10, height: 10 });
    expect(result.width).toBe(10);
  });

  it("accepts a Readable stream input", async () => {
    const result = await transform(createReadStream(PNG), { width: 10, height: 10 });
    expect(result.width).toBe(10);
  });
});

describe("thumbnail", () => {
  it("produces an exactly square image", async () => {
    const result = await thumbnail(PNG, 64);
    const meta = await sharp(result.data).metadata();
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
  });

  it("crops the rotated fixture right way up", async () => {
    const result = await thumbnail(ROTATED, 48, { format: "png" });
    const meta = await sharp(result.data).metadata();
    expect(meta.width).toBe(48);
    expect(meta.height).toBe(48);
  });
});

describe("getMetadata", () => {
  it("returns oriented dimensions and the raw orientation value", async () => {
    const meta = await getMetadata(ROTATED);
    expect(meta.orientation).toBe(6);
    expect(meta.width).toBe(60);
    expect(meta.height).toBe(120);
    expect(meta.format).toBe("jpeg");
  });

  it("leaves dimensions untouched when there is no rotation", async () => {
    const meta = await getMetadata(PNG);
    expect(meta.width).toBe(120);
    expect(meta.height).toBe(60);
  });
});

describe("error handling", () => {
  it("rejects corrupt / non-image input", async () => {
    await expect(getMetadata(CORRUPT)).rejects.toBeInstanceOf(ImageProcessingError);
    await expect(transform(CORRUPT, { width: 10 })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects a missing file without crashing", async () => {
    await expect(getMetadata(fixture("does-not-exist.jpg"))).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects an unsupported output format", async () => {
    await expect(transform(PNG, { format: "tiff" as never })).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
  });
});