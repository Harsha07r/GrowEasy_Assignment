// Shared CRM record contract — mirrors backend/src/types/crm.types.ts
// Keep both in sync manually (no shared package, per project constraints).

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

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
