import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");

// A 120x60 landscape block with a blue stripe on the left, so a crop or
// rotation is visually obvious if you ever open the file.
const base = () =>
  sharp({
    create: { width: 120, height: 60, channels: 3, background: { r: 200, g: 80, b: 40 } },
  }).composite([
    {
      input: { create: { width: 40, height: 60, channels: 3, background: { r: 30, g: 90, b: 200 } } },
      left: 0,
      top: 0,
    },
  ]);

// JPEG tagged with EXIF orientation 6 -> raw grid is 120x60, displayed 60x120.
await base().jpeg({ quality: 80 }).withMetadata({ orientation: 6 }).toFile(join(out, "rotated-exif.jpg"));
// Plain PNG, no EXIF at all.
await base().png().toFile(join(out, "plain.png"));
// Already-webp image, to test convert/passthrough.
await base().webp({ quality: 80 }).toFile(join(out, "sample.webp"));
// Not an image at all, for the error-path test.
await writeFile(join(out, "corrupt.bin"), Buffer.from("this is definitely not an image\n".repeat(8)));

console.log(`fixtures written to ${out}`);