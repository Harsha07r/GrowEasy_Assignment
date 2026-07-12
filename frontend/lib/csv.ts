import Papa, { type ParseError, type ParseResult } from "papaparse";
import type { CsvRow } from "@/types/crm";

export interface ParsedCsv {
  columns: string[];
  rows: CsvRow[];
  totalRows: number;
  errors: ParseError[];
}

// Parses a CSV file in the browser, before it's ever sent to the backend.
// This exists so the preview step can show rows/columns instantly, without
// waiting on a network round trip.
// Kept off the worker thread (papaparse's worker mode needs its own script
// URL resolved, which is unreliable under Next.js bundling); files are
// capped at 5MB so main-thread parsing stays fast.
// Input: the File the user picked.
// Output: a promise resolving to the parsed columns, rows, and any errors.
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<Record<string, string>>) => {
        resolve({
          columns: results.meta.fields ?? [],
          rows: results.data,
          totalRows: results.data.length,
          errors: results.errors,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}
