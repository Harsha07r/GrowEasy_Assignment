// Splits parsed CSV rows into fixed-size batches before sending to Gemini.
// This exists because Gemini is called once per batch (not once per row) to
// keep the number of AI requests small.
import type { CsvRow } from "../types/crm.types.js";

// Splits an array of CSV rows into smaller batches.
// Input: all CSV rows, and the number of rows per batch.
// Output: an array of batches (each batch is itself an array of rows).
export function splitIntoBatches(rows: CsvRow[], batchSize: number): CsvRow[][] {
  if (batchSize <= 0) {
    throw new Error("Batch size must be greater than zero");
  }

  const batches: CsvRow[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    batches.push(rows.slice(i, i + batchSize));
  }
  return batches;
}
