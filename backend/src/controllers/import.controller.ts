// This controller is intentionally thin: it just wires the request/response
// to the services below. All real logic (parsing, calling Gemini, validating)
// lives in csv.service.ts, gemini.service.ts and validation.service.ts.
import fs from "node:fs/promises";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { CsvValidationError, parseCsvFile } from "../services/csv.service.js";
import {
  GeminiExtractionError,
  extractCrmRecordsWithRetry,
} from "../services/gemini.service.js";
import { validateCrmRecords } from "../services/validation.service.js";
import type { CrmRecord, CsvRow, SkippedRow } from "../types/crm.types.js";
import { splitIntoBatches } from "../utils/batch.js";

// Handles POST /api/imports.
// Input: the HTTP request, with a CSV file attached under the "file" field.
// Output: sends a JSON response with the imported records, skipped rows, and
// the total row count. Always deletes the uploaded file when it's done.
export async function importCsv(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    res.status(400).json({
      error: "No file uploaded. Attach a CSV file under the 'file' field.",
    });
    return;
  }

  try {
    let parsedCsv;
    try {
      parsedCsv = await parseCsvFile(uploadedFile.path);
    } catch (err) {
      if (err instanceof CsvValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    const { rows } = parsedCsv;
    const batches = splitIntoBatches(rows, env.CSV_BATCH_SIZE);

    const imported: CrmRecord[] = [];
    const skipped: SkippedRow[] = [];
    let rowOffset = 0;

    for (const batch of batches) {
      await processBatch(batch, rowOffset, imported, skipped);
      rowOffset += batch.length;
    }

    res.status(200).json({ imported, skipped, totalRows: rows.length });
  } catch (err) {
    next(err);
  } finally {
    await fs.unlink(uploadedFile.path).catch(() => {});
  }
}

// Sends one batch of rows to Gemini and sorts the results into "imported"
// or "skipped". Gemini is retried once if it fails (see gemini.service.ts).
// If it still fails after the retry, every row in the batch is marked
// skipped instead of crashing the whole import.
// Input: the batch of rows, the row index the batch starts at, and the
// shared imported/skipped arrays to push results into.
// Output: nothing — results are pushed into the arrays passed in.
async function processBatch(
  batch: CsvRow[],
  rowOffset: number,
  imported: CrmRecord[],
  skipped: SkippedRow[]
) {
  let extractedItems;
  try {
    extractedItems = await extractCrmRecordsWithRetry(batch);
  } catch (err) {
    const reason =
      err instanceof GeminiExtractionError
        ? `Gemini extraction failed: ${err.message}`
        : `Gemini extraction failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    batch.forEach((rawRow, i) => {
      skipped.push({ rowIndex: rowOffset + i, raw: rawRow, reason });
    });
    return;
  }

  extractedItems.forEach((item, i) => {
    const rawRow = batch[i];
    const rowIndex = rowOffset + i;

    if (item?.skip) {
      skipped.push({
        rowIndex,
        raw: rawRow,
        reason: item.reason?.trim() || "Skipped: missing both email and mobile",
      });
      return;
    }

    if (!item?.record) {
      skipped.push({
        rowIndex,
        raw: rawRow,
        reason: "Gemini did not return a record for this row",
      });
      return;
    }

    const { valid, invalid } = validateCrmRecords([item.record]);
    if (valid.length === 1) {
      imported.push(valid[0]);
    } else {
      skipped.push({
        rowIndex,
        raw: rawRow,
        reason: invalid[0]?.errors.join("; ") ?? "Validation failed",
      });
    }
  });
}
