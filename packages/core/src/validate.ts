import { ImageProcessingError } from "./errors.js";
import { FIT_MODES, OUTPUT_FORMATS, type Fit, type OutputFormat, type TransformOptions } from "./types.js";

export function isOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === "string" && (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function isFit(value: unknown): value is Fit {
  return typeof value === "string" && (FIT_MODES as readonly string[]).includes(value);
}

function assertPositiveInt(value: number | undefined, name: string): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value <= 0 || value > 20000) {
    throw new ImageProcessingError("INVALID_OPTIONS", `"${name}" must be a positive integer.`);
  }
}

export function validateTransformOptions(opts: TransformOptions): void {
  assertPositiveInt(opts.width, "width");
  assertPositiveInt(opts.height, "height");

  if (opts.format !== undefined && !isOutputFormat(opts.format)) {
    throw new ImageProcessingError(
      "UNSUPPORTED_FORMAT",
      `Unsupported format "${String(opts.format)}". Supported: ${OUTPUT_FORMATS.join(", ")}.`
    );
  }

  if (opts.fit !== undefined && !isFit(opts.fit)) {
    throw new ImageProcessingError("INVALID_OPTIONS", `Unsupported fit "${String(opts.fit)}".`);
  }

  if (opts.quality !== undefined && (!Number.isInteger(opts.quality) || opts.quality < 1 || opts.quality > 100)) {
    throw new ImageProcessingError("INVALID_OPTIONS", `"quality" must be an integer 1-100.`);
  }
}