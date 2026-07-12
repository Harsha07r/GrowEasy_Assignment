// CrmRecord is derived from the Zod schema (schemas/crm.schema.ts) so the
// runtime validation and the compile-time type can never drift apart.
// Mirrors frontend/types/crm.ts — kept in sync manually (no shared package,
// per project constraints).
import type { CrmRecord } from "../schemas/crm.schema.js";
export type { CrmRecord };

// One row from an uploaded CSV file: column name -> raw text value.
export interface CsvRow {
  [column: string]: string;
}

export interface SkippedRow {
  rowIndex: number;
  raw: CsvRow;
  reason: string;
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRow[];
  totalRows: number;
}
