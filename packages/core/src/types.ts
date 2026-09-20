// packages/core/src/types.ts
import type { Readable } from "node:stream";

export type ImageInput = string | Buffer | Readable;

export type OutputFormat = "jpeg" | "png" | "webp" | "avif";
export type Fit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface TransformOptions {
  width?: number;
  height?: number;
  fit?: Fit;
  format?: OutputFormat;
  quality?: number;
}

export interface TransformResult {
  data: Buffer;
  format: string;
  width: number;
  height: number;
}