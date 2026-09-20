// Every failure from this library is one of these, so `api` never has to
// string-match Sharp's raw error messages to decide what HTTP status to send.
export class ImageProcessingError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.name = "ImageProcessingError";
        this.code = code;
    }
    static is(error) {
        return error instanceof ImageProcessingError;
    }
}
// Sharp/libvips throw plain Errors for bad input — normalize those into our
// own error type so callers only ever handle one shape of error.
export function toImageProcessingError(error) {
    if (ImageProcessingError.is(error))
        return error;
    const message = error instanceof Error ? error.message : String(error);
    if (/unsupported image format|premature end|corrupt|Input file is missing/i.test(message)) {
        return new ImageProcessingError("INVALID_INPUT", "Input is not a readable image (corrupt file or unsupported format).", { cause: error });
    }
    return new ImageProcessingError("PROCESSING_FAILED", message, { cause: error });
}
