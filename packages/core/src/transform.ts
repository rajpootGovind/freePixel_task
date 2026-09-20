// packages/core/src/transform.ts
import sharp from "sharp";
import type { ImageInput, TransformOptions, TransformResult } from "./types.js";

export async function transform(
  input: ImageInput,
  options: TransformOptions = {}
): Promise<TransformResult> {
  // sharp(input) accepts a path, a Buffer, or a stream directly — no
  // manual branching needed for those three input kinds.
  let pipeline = sharp(input as never);

  // .rotate() with NO arguments reads the EXIF orientation tag and
  // rotates the pixels to match it. Must happen before resize.
  pipeline = pipeline.rotate();

  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width,
      height: options.height,
      fit: options.fit ?? "cover",
    });
  }

  if (options.format) {
    pipeline = pipeline.toFormat(options.format, {
      quality: options.quality ?? 80,
    });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    data,
    format: options.format ?? info.format,
    width: info.width,
    height: info.height,
  };
}