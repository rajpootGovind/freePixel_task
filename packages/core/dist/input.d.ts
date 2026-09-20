import type { Sharp } from "sharp";
import type { ImageInput } from "./types.js";
/**
 * Feeds any of our three input kinds into a Sharp duplex pipeline.
 *
 * Returns a promise that ONLY ever rejects — it settles if the SOURCE fails
 * (missing file, broken upload stream). Sharp's own toBuffer()/metadata()
 * promises don't see errors from the input side, so callers race this
 * against them (see transform.ts / metadata.ts) — otherwise a missing file
 * crashes the whole process instead of rejecting cleanly.
 */
export declare function feedInput(input: ImageInput, pipeline: Sharp): Promise<never>;
