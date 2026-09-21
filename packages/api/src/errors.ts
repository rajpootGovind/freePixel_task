import type { NextFunction, Request, Response } from "express";
import { ImageProcessingError } from "@imgsvc/core";

// Centralised error handler — every route just throws/rejects, this is the
// only place that decides what JSON error shape goes back to the client.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (ImageProcessingError.is(err)) {
    const status = err.code === "PROCESSING_FAILED" ? 500 : 400;
    res.status(status).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.message.includes("Unexpected field")) {
    // multer's own error when a form field name doesn't match what we expect
    res.status(400).json({ error: "Expected a file field named \"file\"." });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

// Wraps an async route handler so a rejected promise reaches errorHandler
// instead of crashing the process (Express 4 needs this; Express 5 actually
// does this automatically, but being explicit costs nothing and works either way).
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}