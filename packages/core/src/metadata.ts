import sharp from "sharp";
import { ImageProcessingError, toImageProcessingError } from "./errors.js";
import { feedInput } from "./input.js";
import type { ExifSummary, ImageInput, Metadata } from "./types.js";
import exifReader from "exif-reader";

// EXIF orientations 5-8 involve a 90-degree turn, so width/height swap.
function isQuarterTurn(orientation: number | undefined): boolean {
  return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

function extractExif(raw: Buffer | undefined): ExifSummary | undefined {
  if (!raw) return undefined;
  try {
    const parsed = exifReader(raw);
    const summary: ExifSummary = {
      make: parsed.Image?.Make,
      model: parsed.Image?.Model,
      dateTimeOriginal: parsed.Photo?.DateTimeOriginal?.toISOString(),
      iso: parsed.Photo?.ISOSpeedRatings,
      fNumber: parsed.Photo?.FNumber,
      exposureTime: parsed.Photo?.ExposureTime,
    };
    const entries = Object.entries(summary).filter(([, v]) => v !== undefined);
    return entries.length ? (Object.fromEntries(entries) as ExifSummary) : undefined;
  } catch {
    return undefined; // malformed EXIF should never fail the whole request
  }
}

export async function getMetadata(input: ImageInput): Promise<Metadata> {
  const pipeline = sharp({ failOn: "error" });
  const sourceFailure = feedInput(input, pipeline);

  try {
    const meta = await Promise.race([pipeline.metadata(), sourceFailure]);

    if (meta.width === undefined || meta.height === undefined || meta.format === undefined) {
      throw new ImageProcessingError("INVALID_INPUT", "Could not read image dimensions.");
    }

    const swap = isQuarterTurn(meta.orientation);
    const result: Metadata = {
      width: swap ? meta.height : meta.width,
      height: swap ? meta.width : meta.height,
      format: meta.format,
    };
    if (meta.orientation !== undefined) result.orientation = meta.orientation;

    const exif = extractExif(meta.exif);
    if (exif) result.exif = exif;

    return result;
  } catch (error) {
    throw toImageProcessingError(error);
  }
}