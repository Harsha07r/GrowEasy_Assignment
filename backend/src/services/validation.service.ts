import { crmRecordSchema, type CrmRecord } from "../schemas/crm.schema.js";

// This service exists so every record Gemini returns passes through the same
// schema check before it's used — malformed or hallucinated fields are
// rejected here instead of being trusted as-is.

export interface ValidationFailure {
  record: unknown;
  errors: string[];
}

export interface ValidationOutcome {
  valid: CrmRecord[];
  invalid: ValidationFailure[];
}

// Checks a list of candidate CRM records against the shared Zod schema.
// Input: an array of records (usually straight from Gemini, unvalidated).
// Output: the records that passed, and the ones that failed with reasons.
export function validateCrmRecords(records: unknown[]): ValidationOutcome {
  const valid: CrmRecord[] = [];
  const invalid: ValidationFailure[] = [];

  for (const record of records) {
    const result = crmRecordSchema.safeParse(record);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        record,
        errors: result.error.issues.map(
          (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`
        ),
      });
    }
  }

  return { valid, invalid };
}
