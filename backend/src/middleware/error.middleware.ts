import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";

// This exists as a single place to turn any thrown error into a JSON
// response, so route handlers can just "throw" instead of formatting
// responses themselves.

// Express calls this whenever a route handler throws or calls next(err).
// Input: the error that was thrown, and the response to write to.
// Output: nothing — sends a JSON error response with the right status code.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File is too large. Maximum size is ${env.MAX_UPLOAD_SIZE_MB}MB.`
        : err.message;
    res.status(400).json({ error: message });
    return;
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  // Thrown by upload.middleware's fileFilter for non-CSV uploads.
  const isUploadRejection = /only \.csv files are allowed/i.test(message);
  res.status(isUploadRejection ? 400 : 500).json({ error: message });
}
