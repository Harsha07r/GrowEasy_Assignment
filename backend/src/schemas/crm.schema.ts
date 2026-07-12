import { z } from "zod";

// Single source of truth for the CRM record shape on the backend. Every
// record Gemini returns is parsed against this before it's ever returned
// to the client — AI output is never trusted as-is.
export const crmRecordSchema = z.object({
  created_at: z.string(),
  name: z.string(),
  email: z.union([z.literal(""), z.string().email()]),
  country_code: z.string().regex(/^\+?[0-9]*$/, "Invalid country code"),
  mobile_without_country_code: z
    .string()
    .regex(/^[0-9]*$/, "Must contain digits only"),
  company: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  lead_owner: z.string(),
  crm_status: z.string(),
  crm_note: z.string(),
  data_source: z.string(),
  possession_time: z.string(),
  description: z.string(),
});

export type CrmRecord = z.infer<typeof crmRecordSchema>;
