import sharp, { type Sharp } from "sharp";
import { toImageProcessingError } from "./errors.js";
import { feedInput } from "./input.js";
import type { ImageInput, TransformOptions, TransformResult } from "./types.js";
import { validateTransformOptions } from "./validate.js";

const DEFAULT_QUALITY = 80;

// Builds the Sharp pipeline. Exported separately so `api` can pipe an
// upload stream straight through it without buffering (see Step 11).
export function createTransformStream(opts: TransformOptions = {}): Sharp {
  validateTransformOptions(opts);

  // .rotate() with no args applies EXIF orientation — must come before
  // resize, or width/height would apply to the unrotated pixel grid.
  const pipeline = sharp({ failOn: "error" }).rotate();

  if (opts.width !== undefined || opts.height !== undefined) {
    pipeline.resize({ width: opts.width, height: opts.height, fit: opts.fit ?? "cover" });
  }

  if (opts.format !== undefined) {
    const quality = opts.quality ?? DEFAULT_QUALITY;
    pipeline.toFormat(opts.format, opts.format === "png" ? {} : { quality });
  }

  return pipeline;
}

export async function transform(input: ImageInput, opts: TransformOptions = {}): Promise<TransformResult> {
  const pipeline = createTransformStream(opts);
  const sourceFailure = feedInput(input, pipeline);

  try {
    const { data, info } = await Promise.race([
      pipeline.toBuffer({ resolveWithObject: true }),
      sourceFailure,
    ]);
    return {
      data,
      // Sharp reports avif output as "heif" — report what was actually
      // requested so `api` can set Content-Type directly from this value.
      format: opts.format ?? info.format,
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    throw toImageProcessingError(error);
  }
}