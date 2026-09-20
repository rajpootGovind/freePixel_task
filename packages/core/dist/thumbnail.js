import { ImageProcessingError } from "./errors.js";
import { transform } from "./transform.js";
// Square thumbnail, cropped (not padded) by default: fit "cover" scales the
// image to fill size x size and centre-crops the overflow, so the result is
// always exactly square with no distortion and no padding.
export async function thumbnail(input, size, opts = {}) {
    if (!Number.isInteger(size) || size <= 0) {
        throw new ImageProcessingError("INVALID_OPTIONS", `"size" must be a positive integer.`);
    }
    return transform(input, { ...opts, width: size, height: size, fit: opts.fit ?? "cover" });
}
