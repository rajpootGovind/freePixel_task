import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { ImageProcessingError } from "./errors.js";
/**
 * Feeds any of our three input kinds into a Sharp duplex pipeline.
 *
 * Returns a promise that ONLY ever rejects — it settles if the SOURCE fails
 * (missing file, broken upload stream). Sharp's own toBuffer()/metadata()
 * promises don't see errors from the input side, so callers race this
 * against them (see transform.ts / metadata.ts) — otherwise a missing file
 * crashes the whole process instead of rejecting cleanly.
 */
export function feedInput(input, pipeline) {
    return new Promise((_resolve, reject) => {
        const fail = (message, cause) => {
            const error = new ImageProcessingError("INVALID_INPUT", message, { cause });
            pipeline.destroy(error);
            reject(error);
        };
        pipeline.on("error", () => { }); // prevent unhandled 'error' event
        if (typeof input === "string") {
            const source = createReadStream(input);
            source.on("error", (cause) => fail(`Could not read image at "${input}".`, cause));
            source.pipe(pipeline);
            return;
        }
        if (Buffer.isBuffer(input)) {
            pipeline.end(input);
            return;
        }
        if (input instanceof Readable) {
            input.on("error", (cause) => fail("Input stream failed while reading.", cause));
            input.pipe(pipeline);
            return;
        }
        fail("input must be a file path, a Buffer, or a Readable stream.");
    });
}
