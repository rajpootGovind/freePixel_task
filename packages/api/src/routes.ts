import { Readable } from "node:stream";
import { Router } from "express";
import multer from "multer";
import { createTransformStream, getMetadata, ImageProcessingError } from "@imgsvc/core";
import { asyncHandler } from "./errors.js";
import { parseTransformOptions } from "./parseOptions.js";

// memoryStorage: multer parses the multipart body and hands us req.file.buffer.
// From there on (see below) everything is a real stream into Sharp.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, 
});

export const router = Router();

router.post(
  "/transform",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    console.log("Received /transform request with body:", req.body);
    if (!req.file) {
      throw new ImageProcessingError("INVALID_INPUT", `Missing required file field "file".`);
    }

    const opts = parseTransformOptions(req.body as Record<string, string | undefined>);

    // The pipeline is built in `core`, not here — this route only turns the
    // buffer into a stream and pipes it through. No sharp calls in this file.
    const pipeline = createTransformStream(opts);
    const contentType = `image/${opts.format ?? "jpeg"}`;

    res.status(200);
    res.setHeader("Content-Type", contentType);

    pipeline.on("error", (err) => {
      // If the pipeline errors mid-stream, headers are already sent — the
      // best we can do is end the response. Real production code would log
      // this distinctly; noted as a known limitation in the README.
      res.end();
      console.error("transform stream error:", err);
    });

    Readable.from(req.file.buffer).pipe(pipeline).pipe(res);
  })
);

router.post(
  "/info",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ImageProcessingError("INVALID_INPUT", `Missing required file field "file".`);
    }

    const metadata = await getMetadata(Readable.from(req.file.buffer));
    res.status(200).json(metadata);
  })
);