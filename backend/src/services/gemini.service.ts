// This service exists to talk to Google Gemini and turn raw CSV rows into
// CRM records. It only calls the model and parses its JSON reply — it does
// NOT validate the result against the CRM schema. That happens afterwards in
// validation.service.ts, because AI output should never be trusted as-is.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import type { CsvRow } from "../types/crm.types.js";

// GEMINI_API_KEY is optional at boot (see config/env.ts) so the server can
// start without it. This is the point where it's actually required —
// called when the Gemini client is initialized/used, not before.
// Input: nothing.
// Output: the API key string, or it throws if the key is missing.
export function requireGeminiApiKey(): string {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to backend/.env to use the Gemini integration."
    );
  }
  return env.GEMINI_API_KEY;
}

// Thrown when Gemini fails, or returns something that isn't the JSON array
// we asked for. The controller catches this per batch and skips those rows
// instead of crashing the whole import.
export class GeminiExtractionError extends Error {}

const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

// One element per input row, in the same order as the input. This keeps the
// Gemini output aligned with the original row so the controller can always
// tell which raw row a result (or a skip) came from.
export interface GeminiExtractionItem {
  skip: boolean;
  reason?: string;
  record?: object;
}

let cachedClient: GoogleGenerativeAI | null = null;

// Returns a single shared Gemini client, creating it the first time it's needed.
// Input: nothing.
// Output: a GoogleGenerativeAI client.
function getClient(): GoogleGenerativeAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(requireGeminiApiKey());
  }
  return cachedClient;
}

// Builds the instruction text sent to Gemini for one batch of rows.
// Input: the batch of CSV rows.
// Output: the full prompt string, including the rows themselves as JSON.
function buildPrompt(rows: CsvRow[]): string {
  return `You are a data extraction engine that converts raw CSV lead rows into a strict CRM schema.

Return ONLY a valid JSON array as plain text. No markdown, no code fences, no explanations, no extra commentary.

The output array MUST have EXACTLY ${rows.length} elements, one per input row, in the SAME ORDER as the "Input rows" array below (output[i] corresponds to input row i).

Each element must be ONE of:
1. A skip marker: {"skip": true, "reason": "<short reason>"} — use this ONLY when BOTH an email address and a phone/mobile number are missing from the row.
2. A CRM record: {"skip": false, "record": { ...all fields listed below... }}

CRM record fields (include ALL of them, use "" for anything unknown or missing — never invent or guess a value):
- created_at: string, a JavaScript Date-compatible date string (e.g. ISO 8601). Use a date already present in the row if there is one, otherwise "".
- name: string
- email: string — the FIRST email address found in the row, or "" if none.
- country_code: string — digits only, optional leading "+", or "" if unknown.
- mobile_without_country_code: string — digits only (no country code, no spaces, no symbols), the FIRST phone number found in the row, or "" if none.
- company: string
- city: string
- state: string
- country: string
- lead_owner: string
- crm_status: string — MUST be EXACTLY one of: ${CRM_STATUS_VALUES.join(", ")}. If it cannot be determined, use "".
- crm_note: string — free text. Append any EXTRA emails/phone numbers beyond the first one here (e.g. "Additional email: a@b.com; Additional phone: 9998887777"), plus any other useful notes from the row.
- data_source: string — MUST be EXACTLY one of: ${DATA_SOURCE_VALUES.join(", ")}. If the row does not clearly match one of these, use "" — never guess.
- possession_time: string
- description: string

Rules:
- Never hallucinate values. If a field isn't present in the row, use "".
- Skip a row (skip: true) ONLY when both email and mobile/phone are missing.
- Multiple emails in a row: the first goes into "email", the rest go into "crm_note".
- Multiple phone numbers in a row: the first goes into "mobile_without_country_code", the rest go into "crm_note".
- crm_status must only ever be one of the exact values above, or "".
- data_source must only ever be one of the exact values above, or "".
- Dates must be in a format JavaScript's Date constructor can parse, or "".

Input rows (JSON array, index-aligned with your output):
${JSON.stringify(rows)}`;
}

// Gemini sometimes wraps JSON in a ```json ... ``` code fence even when told
// not to. This strips that fence so JSON.parse doesn't choke on it.
// Input: the raw text Gemini returned.
// Output: the same text with any surrounding code fence removed.
function stripCodeFence(text: string): string {
  const trimmedText = text.trim();
  const fenceMatch = trimmedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmedText;
}

// Sends one batch of CSV rows to Gemini and returns its parsed reply.
// Input: a batch of CSV rows (all from the same import).
// Output: one GeminiExtractionItem per input row, same order as the input.
export async function extractCrmRecords(
  rows: CsvRow[]
): Promise<GeminiExtractionItem[]> {
  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  let responseText: string;
  try {
    const result = await model.generateContent(buildPrompt(rows));
    responseText = result.response.text();
  } catch (err) {
    throw new GeminiExtractionError(
      `Gemini request failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(stripCodeFence(responseText));
  } catch (err) {
    throw new GeminiExtractionError(
      `Gemini returned invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  if (!Array.isArray(parsedResponse)) {
    throw new GeminiExtractionError("Gemini response was not a JSON array.");
  }

  if (parsedResponse.length !== rows.length) {
    throw new GeminiExtractionError(
      `Gemini returned ${parsedResponse.length} results for a batch of ${rows.length} rows.`
    );
  }

  return parsedResponse as GeminiExtractionItem[];
}

// Same as extractCrmRecords, but retries once if the first attempt fails.
// This exists because a single Gemini call can fail transiently (a dropped
// request, a momentary bad response) — retrying once avoids throwing away a
// whole batch of rows for a one-off hiccup.
// Input: a batch of CSV rows.
// Output: one GeminiExtractionItem per input row. Throws only if BOTH the
// first attempt and the retry fail.
export async function extractCrmRecordsWithRetry(
  rows: CsvRow[]
): Promise<GeminiExtractionItem[]> {
  try {
    return await extractCrmRecords(rows);
  } catch {
    // First attempt failed — try exactly once more before giving up.
    return await extractCrmRecords(rows);
  }
}
