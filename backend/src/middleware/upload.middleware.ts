import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env.js";

// This exists to configure Multer once, in one place, so every route that
// needs a file upload can just reuse `upload` instead of repeating this setup.

// Temp holding area for uploaded CSVs — parsed then removed by the controller
// once processing finishes (no permanent storage, no DB).
export const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  // Always save uploads into the same temp folder.
  destination: (_req, _file, cb) => cb(null, uploadDir),
  // Give each upload a random name so two uploads never collide.
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".csv";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  // Rejects anything that isn't a CSV file before it's even saved to disk.
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      cb(new Error("Only .csv files are allowed"));
      return;
    }
    cb(null, true);
  },
});
