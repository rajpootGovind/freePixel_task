import type { Readable } from "node:stream";

// Input can be a file path, an in-memory Buffer, or a Node stream
// (this is what lets api hand us an uploaded file directly).
export type ImageInput = string | Buffer | Readable;

export const OUTPUT_FORMATS = ["jpeg", "png", "webp", "avif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const FIT_MODES = ["cover", "contain", "fill", "inside", "outside"] as const;
export type Fit = (typeof FIT_MODES)[number];

export interface TransformOptions {
  width?: number;
  height?: number;
  fit?: Fit;
  format?: OutputFormat;
  quality?: number;
}

export type ThumbnailOptions = Omit<TransformOptions, "width" | "height">;

export interface TransformResult {
  data: Buffer;
  format: string;
  width: number;
  height: number;
}

export interface ExifSummary {
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
}

export interface Metadata {
  // Displayed dimensions — already account for EXIF orientation.
  width: number;
  height: number;
  format: string;
  orientation?: number;
  exif?: ExifSummary;
}