import type { Readable } from "node:stream";
export type ImageInput = string | Buffer | Readable;
export declare const OUTPUT_FORMATS: readonly ["jpeg", "png", "webp", "avif"];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
export declare const FIT_MODES: readonly ["cover", "contain", "fill", "inside", "outside"];
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
    width: number;
    height: number;
    format: string;
    orientation?: number;
    exif?: ExifSummary;
}
