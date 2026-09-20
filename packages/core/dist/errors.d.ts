export type ImageErrorCode = "INVALID_INPUT" | "INVALID_OPTIONS" | "UNSUPPORTED_FORMAT" | "PROCESSING_FAILED";
export declare class ImageProcessingError extends Error {
    readonly code: ImageErrorCode;
    constructor(code: ImageErrorCode, message: string, options?: {
        cause?: unknown;
    });
    static is(error: unknown): error is ImageProcessingError;
}
export declare function toImageProcessingError(error: unknown): ImageProcessingError;
