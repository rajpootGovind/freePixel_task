import { ImageProcessingError, isFit, isOutputFormat, type TransformOptions } from "@imgsvc/core";

// multer puts non-file fields in req.body as strings — this turns those
// strings into the typed options core.transform() expects, and rejects
// garbage input before it ever reaches sharp.
export function parseTransformOptions(body: Record<string, string | undefined>): TransformOptions {
  const opts: TransformOptions = {};

  if (body.width !== undefined) {
    const width = Number(body.width);
    if (!Number.isInteger(width) || width <= 0) {
      throw new ImageProcessingError("INVALID_OPTIONS", `"width" must be a positive integer.`);
    }
    opts.width = width;
  }

  if (body.height !== undefined) {
    const height = Number(body.height);
    if (!Number.isInteger(height) || height <= 0) {
      throw new ImageProcessingError("INVALID_OPTIONS", `"height" must be a positive integer.`);
    }
    opts.height = height;
  }

  if (body.fit !== undefined) {
    if (!isFit(body.fit)) {
      throw new ImageProcessingError("INVALID_OPTIONS", `Unsupported fit "${body.fit}".`);
    }
    opts.fit = body.fit;
  }

  if (body.format !== undefined) {
    if (!isOutputFormat(body.format)) {
      throw new ImageProcessingError("UNSUPPORTED_FORMAT", `Unsupported format "${body.format}".`);
    }
    opts.format = body.format;
  }

  if (body.quality !== undefined) {
    const quality = Number(body.quality);
    if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
      throw new ImageProcessingError("INVALID_OPTIONS", `"quality" must be an integer 1-100.`);
    }
    opts.quality = quality;
  }

  return opts;
}