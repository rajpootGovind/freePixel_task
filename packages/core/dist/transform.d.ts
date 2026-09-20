import { type Sharp } from "sharp";
import type { ImageInput, TransformOptions, TransformResult } from "./types.js";
export declare function createTransformStream(opts?: TransformOptions): Sharp;
export declare function transform(input: ImageInput, opts?: TransformOptions): Promise<TransformResult>;
