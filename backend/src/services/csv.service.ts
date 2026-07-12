// This service exists to keep all CSV parsing/validation logic in one place,
// separate from the HTTP controller. It turns an uploaded file on disk into
// plain row objects the rest of the app can work with.
import fs from "node:fs/promises";
import Papa from "papaparse";
import type { CsvRow } from "../types/crm.types.js";

// Thrown when the uploaded file isn't usable (empty, no headers, no rows).
// The controller catches this and returns a 400 with the message as-is.
export class CsvValidationError extends Error {}

export interface ParsedCsvFile {
  columns: string[];
  rows: CsvRow[];
}

// Reads an uploaded CSV file from disk and parses it into rows.
// Input: the file path on disk.
// Output: the column names and the data rows (headers are not counted as a row).
export async function parseCsvFile(filePath: string): Promise<ParsedCsvFile> {
  const fileContent = await fs.readFile(filePath, "utf-8");

  if (!fileContent.trim()) {
    throw new CsvValidationError("The uploaded file is empty.");
  }

  const parseResult = Papa.parse<CsvRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0];
    throw new CsvValidationError(
      `Invalid CSV file: ${firstError?.message ?? "could not be parsed"}`
    );
  }

  const columns = parseResult.meta.fields ?? [];
  if (columns.length === 0) {
    throw new CsvValidationError("CSV file has no header row.");
  }

  const rows = removeBlankRows(parseResult.data);
  if (rows.length === 0) {
    throw new CsvValidationError("CSV file has no data rows.");
  }

  return { columns, rows };
}

// Drops rows where every column is blank (PapaParse can still emit these
// for trailing blank lines even with skipEmptyLines on).
// Input: raw parsed rows.
// Output: only the rows that have at least one non-empty value.
function removeBlankRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter((row) => {
    const values = Object.values(row);
    return values.some((value) => value?.trim() !== "");
  });
}
