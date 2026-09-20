import { type Fit, type OutputFormat, type TransformOptions } from "./types.js";
export declare function isOutputFormat(value: unknown): value is OutputFormat;
export declare function isFit(value: unknown): value is Fit;
export declare function validateTransformOptions(opts: TransformOptions): void;
